import { tool } from "@langchain/core/tools";
import type { Model, PipelineStage } from "mongoose";
import { z } from "zod";
import { UserModel } from "../models/User";
import { ProductModel } from "../models/Product";
import { OrderModel } from "../models/Order";
import { ECollectionNames, type SanitizeRules, type ToolResult } from "../types";
import { getCollectionSchema } from "./schemaGenerator";
import { aggregateToolRules } from "./aggregateToolRules.ts";

type SortDirection = 1 | -1 | "asc" | "desc" | "ascending" | "descending";

const findParamsSchema = z.object({
  collection: z.nativeEnum(ECollectionNames).describe("The collection name"),
  filter: z.record(z.any()).optional().describe("MongoDB filter object for querying documents"),
  projection: z
    .record(z.union([z.number(), z.boolean()]))
    .optional()
    .describe("MongoDB projection object to specify which fields to include/exclude"),
  limit: z
    .number()
    .int()
    .min(1)
    .max(50)
    .optional()
    .default(10)
    .describe("Maximum number of documents to return (1-50, default: 10)"),
  sort: z
    .object({})
    .catchall(z.custom<SortDirection>())
    .optional()
    .describe("Sort object with field names as keys and sort direction as values"),
});

const aggregateParamsSchema = z.object({
  collection: z.nativeEnum(ECollectionNames).describe("The collection name"),
  pipeline: z.custom<PipelineStage[]>().describe("MongoDB aggregation pipeline"),
});

const countParamsSchema = z.object({
  collection: z.nativeEnum(ECollectionNames).describe("The collection name"),
  filter: z.record(z.any()).optional().describe("MongoDB filter object for counting documents"),
});

const collectionSchemaParamsSchema = z.object({
  collection: z.nativeEnum(ECollectionNames).describe("The collection name"),
});


/**
 * Sanitizes a MongoDB aggregation pipeline by injecting predefined filter rules
 * into stages that can reference other collections.
 *
 * Supported stages:
 *  - $lookup: Prepends a $match stage to restrict documents from the "from" collection.
 *  - $unionWith: Prepends a $match stage (or creates one if only collection name is provided).
 *  - $facet: Recursively sanitizes each sub-pipeline.
 *
 * The `rules` parameter defines a map of { collectionName -> filterObject }.
 * Whenever a stage references a collection listed in `rules`, the filterObject
 * is automatically applied as a $match condition inside that stage.
 *
 * This ensures that sensitive collections are always queried with the proper
 * restrictions, preventing unintended data exposure.
 *
 * @param pipeline The aggregation pipeline to sanitize.
 * @param rules    A map of collection names to $match filters that must be enforced.
 * @returns        A sanitized copy of the pipeline with enforced filters.
 *
 * @example
 * const rules = {
 *   users: { isActive: true },
 *   orders: { status: "delivered" }
 * };
 *
 * const pipeline = [
 *   { $lookup: { from: "users", localField: "userId", foreignField: "_id" } },
 *   { $unionWith: { coll: "orders", pipeline: [{ $project: { total: 1 } }] } }
 * ];
 *
 * const sanitized = sanitizePipeline(pipeline, rules);
 */

export function sanitizePipeline(
  pipeline: PipelineStage[],
  rules: SanitizeRules
): PipelineStage[] {
  return pipeline.map((stage) => {
    // --- $lookup handling ---
    if ("$lookup" in stage) {
      const lookup = stage.$lookup as any;

      if (!lookup.pipeline) {
        lookup.pipeline = [];
      }

      const rule = rules[lookup.from];
      if (rule) {
        lookup.pipeline = [{ $match: rule }, ...lookup.pipeline];
      }

      return { $lookup: lookup };
    }

    // --- $facet handling (recursive) ---
    if ("$facet" in stage) {
      const facet = stage.$facet as Record<string, PipelineStage[]>;
      for (const key in facet) {
        facet[key] = sanitizePipeline(facet[key], rules);
      }
      return { $facet: facet };
    }

    // --- $unionWith handling ---
    if ("$unionWith" in stage) {
      let union = stage.$unionWith as any;

      if (typeof union === "string") {
        const rule = rules[union];
        if (rule) {
          union = { coll: union, pipeline: [{ $match: rule }] };
        } else {
          union = { coll: union };
        }
      } else if (union.pipeline) {
        union.pipeline = sanitizePipeline(union.pipeline, rules);

        const rule = rules[union.coll];
        if (rule) {
          union.pipeline = [{ $match: rule }, ...union.pipeline];
        }
      }

      return { $unionWith: union };
    }

    // leave other stages untouched
    return stage;
  }) as PipelineStage[];
}

/**
 * Factory class for creating MongoDB tools.
 * This class encapsulates the logic for creating tools that interact with a MongoDB database.
 * It uses a factory pattern to create tools for finding, counting, aggregating, and getting collection schemas.
 * @param sessionId The session ID to use for the tools.
 * @returns An array of tools.
 */
export class MongoDBToolsFactory {
  private getModel(collection: string): Model<any> {
    switch (collection.toLowerCase()) {
      case "users":
        return UserModel;
      case "products":
        return ProductModel;
      case "orders":
        return OrderModel;
      default:
        throw new Error(`Invalid collection name: ${collection}`);
    }
  }

  /**
   * Get dynamically generated schema for a collection
   * This introspects the actual Mongoose model to extract complete schema information
   */
  private getDynamicCollectionSchema(collection: string): Record<string, string> {
    try {
      return getCollectionSchema(collection);
    } catch (error) {
      console.error(`❌ Error getting dynamic schema for ${collection}:`, error);
      return {};
    }
  }

  /**
   * Creates a tool for finding documents in a MongoDB collection.
   * @param sessionId The session ID to use for the tool.
   * @returns A tool for finding documents.
   */
  createFindTool(sessionId: string) {
    return tool(
      async (input: z.infer<typeof findParamsSchema>): Promise<string> => {
        try {
          const { collection, filter = {}, projection = {}, sort = {}, limit = 10 } = input;
          const safeLimit = Math.min(Math.max(1, limit), 50);
          
          const model = this.getModel(collection);
          const docs = await model
            .find(filter, projection)
            .limit(safeLimit)
            .sort(sort)
            .lean();

          const result: ToolResult = {
            success: true,
            sessionId,
            collection: collection,
            found: docs.length,
            limit: safeLimit,
            documents: docs,
            query_info: { filter, projection, sort },
          };

          return JSON.stringify(result);
        } catch (error) {
          console.error(`❌ Error in find tool for session ${sessionId}:`, error);
          const result: ToolResult = {
            success: false,
            sessionId: sessionId,
            error: error instanceof Error ? error.message : "Find operation failed",
          };
          return JSON.stringify(result);
        }
      },
      {
        name: "find",
        description: `Find documents in MongoDB collection. Returns array of matching documents.
        Required: collection (string)
        Optional: filter (object), projection (object), limit (number, max 50), sort (object)
        Example: {"collection": "users", "filter": {"country": "USA"}, "sort": {"totalSpent": -1}, "limit": 5}`,
        schema: findParamsSchema,
      },
    );
  }

  /**
   * Creates a tool for counting documents in a MongoDB collection.
   * @param sessionId The session ID to use for the tool.
   * @returns A tool for counting documents.
   */
  createCountTool(sessionId: string) {
    return tool(
      async (input: z.infer<typeof countParamsSchema>): Promise<string> => {
        try {
          const { collection, filter = {} } = input;
          
          const model = this.getModel(collection);
          const count = await model.countDocuments(filter);

          const result: ToolResult = {
            success: true,
            sessionId: sessionId,
            collection: collection,
            count: count,
            filter: filter,
          };

          return JSON.stringify(result);
        } catch (error) {
          console.error(`❌ Error in count tool for session ${sessionId}:`, error);
          const result: ToolResult = {
            success: false,
            sessionId: sessionId,
            error: error instanceof Error ? error.message : "Count operation failed",
          };
          return JSON.stringify(result);
        }
      },
      {
        name: "count",
        description: `Count documents matching filter criteria.
        Required: collection (string)
        Optional: filter (object)
        Example: {"collection": "orders", "filter": {"status": "delivered"}}`,
        schema: countParamsSchema,
      },
    );
  }

  /**
   * Creates a tool for aggregating documents in a MongoDB collection.
   * @param sessionId The session ID to use for the tool.
   * @returns A tool for aggregating documents.
   */
  createAggregateTool(sessionId: string) {
    return tool(
      async (input: z.infer<typeof aggregateParamsSchema>) => {
        try {
          const { collection, pipeline } = input;
          let sanitizedPipeline = pipeline;
          if(Object.keys(aggregateToolRules).length !== 0) {
            sanitizedPipeline = sanitizePipeline(pipeline, aggregateToolRules)
          }
          const model = this.getModel(collection);
          const documents = await model.aggregate(sanitizedPipeline);

          const result: ToolResult = {
            success: true,
            sessionId: sessionId,
            collection: collection,
            pipeline_stages: sanitizedPipeline.length,
            results: documents.length,
            documents: documents,
          };

          return JSON.stringify(result);
        } catch (error) {
          console.error(`❌ Error in aggregate tool for session ${sessionId}:`, error);
          const result: ToolResult = {
            success: false,
            sessionId: sessionId,
            error: error instanceof Error ? error.message : "Aggregation failed",
          };
          return JSON.stringify(result);
        }
      },
      {
        name: "aggregate",
        description: `Execute aggregation pipeline for complex queries and data analysis.
        Required: collection (string), pipeline (array)
        Example: {"collection": "orders", "pipeline": [{"$match": {"status": "delivered"}}, {"$group": {"_id": "$user", "totalSpent": {"$sum": "$finalAmount"}}}]}`,
        schema: aggregateParamsSchema,
      },
    );
  }

  /**
   * Creates a tool for getting the schema of a MongoDB collection.
   * @param sessionId The session ID to use for the tool.
   * @returns A tool for getting the schema of a collection.
   */
  createCollectionSchemaTool(sessionId: string) {
    return tool(
      async (input: z.infer<typeof collectionSchemaParamsSchema>) => {
        try {
          const { collection } = input;
          const schema = this.getDynamicCollectionSchema(collection);
          
          if (Object.keys(schema).length === 0) {
            throw new Error("The requested schema is empty or invalid, or collection not found");
          }

          console.log(`📋 Generated dynamic schema for ${collection} with ${Object.keys(schema).length} fields`);

          const result: ToolResult = {
            success: true,
            sessionId: sessionId,
            collection: collection,
            fieldCount: Object.keys(schema).length,
            collectionJsonSchema: JSON.stringify(schema),
            generatedDynamically: true,
          };
          
          return JSON.stringify(result);
        } catch (error) {
          console.error(`❌ Error in collectionSchema tool for session ${sessionId}:`, error);
          const result: ToolResult = {
            success: false,
            sessionId: sessionId,
            error: error instanceof Error ? error.message : "Collection schema retrieval failed",
          };
          return JSON.stringify(result);
        }
      },
      {
        name: "collectionSchema",
        description: `Retrieves the schema definition of a given MongoDB collection. 
        Returns the structure and field types of the collection.
        Required: collection (string)
        Example: {"collection": "users"}`,
        schema: collectionSchemaParamsSchema,
      },
    );
  }

  /**
   * Creates an array of all available MongoDB tools.
   * @param sessionId The session ID to use for the tools.
   * @returns An array of tools.
   */
  public createAllTools(sessionId: string): any[] {
    return [
      this.createFindTool(sessionId),
      this.createCountTool(sessionId),
      this.createAggregateTool(sessionId),
      this.createCollectionSchemaTool(sessionId),
    ];
  }
}

export const mongoDBToolsFactory = new MongoDBToolsFactory();
