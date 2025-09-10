import type { Model } from "mongoose";
import { UserModel } from "../models/User";
import { ProductModel } from "../models/Product"; 
import { OrderModel } from "../models/Order";
import { ECollectionNames } from "../types";

const collectionToModelMap = {
  [ECollectionNames.USERS]: UserModel,
  [ECollectionNames.PRODUCTS]: ProductModel,
  [ECollectionNames.ORDERS]: OrderModel,
};

/**
 * Extract COMPLETE schema information from a Mongoose model
 */
function extractCompleteMongooseSchema(model: Model<any>, collectionName: string) {
  const schema = model.schema;
  const extracted: Record<string, any> = {};

  // Process ALL paths including nested ones
  const allPaths = schema.paths;

  for (const [pathName, schemaType] of Object.entries(allPaths)) {
    if (pathName === "__v") continue;

    const pathInfo = extractCompletePathInfo(schemaType as any, pathName, 0);
    if (pathInfo) {
      extracted[pathName] = pathInfo;
    }
  }

  // Add virtual fields
  for (const [virtualName, virtual] of Object.entries(schema.virtuals)) {
    if (virtualName === "id") continue;
    extracted[virtualName] = {
      type: "Virtual",
      computed: true,
      description: "Virtual field - computed at runtime",
    };
  }

  // Add timestamps if enabled
  if (schema.options.timestamps) {
    extracted.createdAt = {
      type: "Date",
      auto: true,
      description: "Auto-generated timestamp",
    };
    extracted.updatedAt = {
      type: "Date",
      auto: true,
      description: "Auto-updated timestamp",
    };
  }

  return extracted;
}

/**
 * Extract COMPLETE path information - including ALL enum values and nested fields
 */
function extractCompletePathInfo(schemaType: any, pathName: string, depth = 0): any {
  const info: Record<string, any> = {};
  // Normalize instance name across Mongoose versions
  const rawInstance = schemaType.instance;
  const instance = rawInstance === "ObjectID" ? "ObjectId" : rawInstance;

  switch (instance) {
    case "String":
      info.type = "String";
      if (schemaType.enumValues && schemaType.enumValues.length > 0) {
        info.enum = schemaType.enumValues;
        info.enumCount = schemaType.enumValues.length;
      }
      if (schemaType.options?.minlength) info.minLength = schemaType.options.minlength;
      if (schemaType.options?.maxlength) info.maxLength = schemaType.options.maxlength;
      if (schemaType.options?.match) info.pattern = schemaType.options.match.toString();
      break;

    case "Number":
      info.type = "Number";
      if (schemaType.options?.min !== undefined) info.min = schemaType.options.min;
      if (schemaType.options?.max !== undefined) info.max = schemaType.options.max;
      break;

    case "Date":
      info.type = "Date";
      if (schemaType.options?.min) info.minDate = schemaType.options.min;
      if (schemaType.options?.max) info.maxDate = schemaType.options.max;
      break;

    case "Boolean":
      info.type = "Boolean";
      break;

    case "ObjectId":
      info.type = "ObjectId";
      // Capture references
      if (schemaType.options?.ref) {
        info.ref = schemaType.options.ref;
        const target = findCollectionByModelName(schemaType.options.ref);
        if (target) info.referenceCollection = target;
      }
      break;

    case "Array": {
      info.type = "Array";
      // Items can be in caster or $embeddedSchemaType
      const itemSchemaType = schemaType.caster || schemaType.$embeddedSchemaType;
      if (itemSchemaType) {
        // Recursively extract item info
        const itemInfo = extractCompletePathInfo(itemSchemaType, "", depth + 1);
        info.items = itemInfo;
        // Propagate ref info to array level for easy discovery
        if (itemSchemaType.options?.ref) {
          info.items.ref = itemSchemaType.options.ref;
          const target = findCollectionByModelName(itemSchemaType.options.ref);
          if (target) info.items.referenceCollection = target;
        }
      }
      break;
    }

    case "Embedded":
      info.type = "Object";
      if (schemaType.schema) {
        const nestedFields: Record<string, any> = {};
        for (const [nestedPath, nestedType] of Object.entries(schemaType.schema.paths)) {
          if (nestedPath === "_id" || nestedPath === "__v") continue;
          nestedFields[nestedPath] = extractCompletePathInfo(nestedType as any, nestedPath, depth + 1);
        }
        info.properties = nestedFields;
        info.propertyCount = Object.keys(nestedFields).length;
      }
      break;

    case "Map":
      info.type = "Map";
      if ((schemaType as any).$__schemaType) {
        info.values = extractCompletePathInfo((schemaType as any).$__schemaType, "", depth + 1);
      }
      break;

    default:
      info.type = instance || "Mixed";
  }

  // Common options
  if (schemaType.isRequired) info.required = true;
  if (schemaType.options?.default !== undefined) {
    info.hasDefault = true;
    if (typeof schemaType.options.default !== "function") {
      info.defaultValue = schemaType.options.default;
    }
  }
  if (schemaType.options?.unique) info.unique = true;
  if (schemaType.options?.index) info.indexed = true;
  if (schemaType.options?.sparse) info.sparse = true;
  if (schemaType.options?.select === false) info.excludedByDefault = true;

  // Add validators if present
  if (schemaType.validators && schemaType.validators.length > 0) {
    info.hasValidators = true;
    info.validatorCount = schemaType.validators.length;
  }

  return info;
}

function findCollectionByModelName(modelName: string): string | null {
  const modelToCollection: Record<string, string> = {
    User: ECollectionNames.USERS,
    Users: ECollectionNames.USERS,
    Product: ECollectionNames.PRODUCTS,
    Products: ECollectionNames.PRODUCTS,
    Order: ECollectionNames.ORDERS,
    Orders: ECollectionNames.ORDERS,
  };

  return modelToCollection[modelName] || null;
}

/**
 * Format individual field for agent consumption
 */
function formatFieldForAgent(fieldInfo: any): string {
  let formatted = fieldInfo.type;

  // Add all modifiers
  const modifiers: string[] = [];
  if (fieldInfo.required) modifiers.push("required");
  if (fieldInfo.unique) modifiers.push("unique");
  if (fieldInfo.indexed) modifiers.push("indexed");
  if (fieldInfo.hasDefault) modifiers.push("has-default");

  if (modifiers.length > 0) {
    formatted += `(${modifiers.join(",")})`;
  }

  // Add reference information
  if (fieldInfo.ref) {
    formatted += ` -> ${fieldInfo.referenceCollection || fieldInfo.ref}`;
  }

  // Add ALL enum values
  if (fieldInfo.enum) {
    formatted += ` [${fieldInfo.enum.join("|")}]`;
  }

  // Add constraints
  const constraints: string[] = [];
  if (fieldInfo.min !== undefined) constraints.push(`min:${fieldInfo.min}`);
  if (fieldInfo.max !== undefined) constraints.push(`max:${fieldInfo.max}`);
  if (fieldInfo.minLength) constraints.push(`minLen:${fieldInfo.minLength}`);
  if (fieldInfo.maxLength) constraints.push(`maxLen:${fieldInfo.maxLength}`);

  if (constraints.length > 0) {
    formatted += ` {${constraints.join(",")}}`;
  }

  // Handle arrays with complete item information
  if (fieldInfo.type === "Array" && fieldInfo.items) {
    formatted = `Array<${formatFieldForAgent(fieldInfo.items)}>`;
  }

  // Handle objects with ALL properties listed
  if (fieldInfo.type === "Object" && fieldInfo.properties) {
    const props: Record<string, string> = {};
    for (const [propName, propInfo] of Object.entries(fieldInfo.properties)) {
      props[propName] = formatFieldForAgent(propInfo as any);
    }
    formatted = `Object<${JSON.stringify(props)}>`;
  }

  return formatted;
}

/**
 * Get dynamically generated schema for a collection
 */
export function getCollectionSchema(collectionName: string): Record<string, string> {
  const model = collectionToModelMap[collectionName as keyof typeof collectionToModelMap];
  
  if (!model) {
    console.warn(`⚠️  No model found for collection: ${collectionName}`);
    return {};
  }

  try {
    // Extract complete schema information
    const fullSchema = extractCompleteMongooseSchema(model, collectionName);
    
    // Format for agent consumption
    const formattedSchema: Record<string, string> = {};
    for (const [fieldName, fieldInfo] of Object.entries(fullSchema)) {
      formattedSchema[fieldName] = formatFieldForAgent(fieldInfo);
    }
    
    return formattedSchema;
  } catch (error) {
    console.error(`❌ Error generating schema for ${collectionName}:`, error);
    return {};
  }
}

/**
 * Get all collection schemas
 */
export function getAllCollectionSchemas(): Record<string, Record<string, string>> {
  const allSchemas: Record<string, Record<string, string>> = {};
  
  for (const collectionName of Object.values(ECollectionNames)) {
    allSchemas[collectionName] = getCollectionSchema(collectionName);
  }
  
  return allSchemas;
}

/**
 * Extract relationships between collections
 */
export function extractAllRelationships(): Record<string, any[]> {
  const relationships: Record<string, any[]> = {};

  for (const [collectionName, model] of Object.entries(collectionToModelMap)) {
    const fullSchema = extractCompleteMongooseSchema(model, collectionName);
    const collectionRels: any[] = [];

    // Check every field for relationships
    for (const [fieldName, fieldInfo] of Object.entries(fullSchema)) {
      // Direct ObjectId references
      if (fieldInfo.ref || fieldInfo.referenceCollection) {
        const targetCollection = fieldInfo.referenceCollection || findCollectionByModelName(fieldInfo.ref);
        if (targetCollection) {
          collectionRels.push({
            field: fieldName,
            targetCollection: targetCollection,
            targetModel: fieldInfo.ref,
            type: "reference",
            required: fieldInfo.required || false,
          });
        }
      }

      // Array of ObjectId references
      if (fieldInfo.type === "Array" && fieldInfo.items) {
        if (fieldInfo.items.ref || fieldInfo.items.referenceCollection) {
          const targetCollection =
            fieldInfo.items.referenceCollection || findCollectionByModelName(fieldInfo.items.ref);
          if (targetCollection) {
            collectionRels.push({
              field: fieldName,
              targetCollection: targetCollection,
              targetModel: fieldInfo.items.ref,
              type: "array-reference",
              required: fieldInfo.required || false,
            });
          }
        }
      }

      // Check nested objects for references
      if (fieldInfo.properties) {
        for (const [nestedField, nestedInfo] of Object.entries(fieldInfo.properties)) {
          if ((nestedInfo as any).ref || (nestedInfo as any).referenceCollection) {
            const targetCollection = (nestedInfo as any).referenceCollection || findCollectionByModelName((nestedInfo as any).ref);
            if (targetCollection) {
              collectionRels.push({
                field: `${fieldName}.${nestedField}`,
                targetCollection: targetCollection,
                targetModel: (nestedInfo as any).ref,
                type: "nested-reference",
                required: (nestedInfo as any).required || false,
              });
            }
          }
        }
      }
    }

    if (collectionRels.length > 0) {
      relationships[collectionName] = collectionRels;
    }
  }

  return relationships;
}
