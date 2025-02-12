import "@shopify/shopify-app-remix/adapters/node";
import {
  AdminApiContext,
  ApiVersion,
  AppDistribution,
  shopifyApp,
} from "@shopify/shopify-app-remix/server";
import { PrismaSessionStorage } from "@shopify/shopify-app-session-storage-prisma";
import type { ShopifyRestResources } from "@shopify/shopify-api";
import prisma from "./db.server";

const metafield_variables = {
  customer: {
    name: "Customer Preferences",
    key: "preference",
    namespace: "$app:preferences",
    ownerType: "CUSTOMER",
    type: "single_line_text_field",
  },
  survey:{
    name: "Survey metafield custom",
    key: "survey",
    namespace: "$app:preferences",
    ownerType: "ORDER",
    type: "single_line_text_field",
  }

}


const shopify = shopifyApp({
  apiKey: process.env.SHOPIFY_API_KEY,
  apiSecretKey: process.env.SHOPIFY_API_SECRET || "",
  apiVersion: ApiVersion.January25,
  scopes: process.env.SCOPES?.split(","),
  appUrl: process.env.SHOPIFY_APP_URL || "",
  authPathPrefix: "/auth",
  sessionStorage: new PrismaSessionStorage(prisma),
  distribution: AppDistribution.AppStore,
  hooks: {
    // ON APP INSTALL
    afterAuth: async ({ admin, session }) => {
      console.log("HOOK AFTER AUTH TRIGGERED!!");

      await shopify.registerWebhooks({ session });

      //! CREATE FUNCTION THAT LOOPS THROUGH VARIALBES AND CALLS FUNCTION WITH A promise.all()
      console.log("CUSTOMER METAFIELD");
      try {
        const metafield = await getMetafield(admin, metafield_variables.customer);

        console.log("CUSTOMER METAFIELD FOUND?", metafield);

        if (metafield == null) {
          console.log("CUSTOMER NO METAFIELD FOUND!! CREATE");

          await createMetafield(admin, metafield_variables.customer);
        }
      } catch (error: any) {
        if ("graphQLErrors" in error) {
          console.error(error.graphQLErrors);
        } else {
          console.error(error);
        }

        throw error;
      }

      console.log("SURVEY METAFIELD");
      try {
        const metafield = await getMetafield(admin, metafield_variables.survey);

        console.log("CUSTOMER METAFIELD FOUND?", metafield);

        if (metafield == null) {
          console.log("CUSTOMER NO METAFIELD FOUND!! CREATE");

          await createMetafield(admin, metafield_variables.survey);
        }
      } catch (error: any) {
        if ("graphQLErrors" in error) {
          console.error(error.graphQLErrors);
        } else {
          console.error(error);
        }

        throw error;
      }
    },
  },
  future: {
    unstable_newEmbeddedAuthStrategy: true,
    removeRest: true,
  },
  ...(process.env.SHOP_CUSTOM_DOMAIN
    ? { customShopDomains: [process.env.SHOP_CUSTOM_DOMAIN] }
    : {}),
});

export default shopify;
export const apiVersion = ApiVersion.January25;
export const addDocumentResponseHeaders = shopify.addDocumentResponseHeaders;
export const authenticate = shopify.authenticate;
export const unauthenticated = shopify.unauthenticated;
export const login = shopify.login;
export const registerWebhooks = shopify.registerWebhooks;
export const sessionStorage = shopify.sessionStorage;


async function getMetafield(admin: AdminApiContext<ShopifyRestResources>, metafeild_data: {
  key: string,
  name: string,
  namespace: string,
  ownerType: string,
  type: string
}) {
  console.log("START GETTING METAFIELD!!");

  const {key, name, namespace, ownerType, type} = metafeild_data

  const response = await admin.graphql(getMetafieldQuery, {
    variables: {
      key: key,
      namespace: namespace,
      ownerType: ownerType,
    },
  });

  console.log("METAFIELD GOT", response);

  const json = await response.json();
  return json.data?.metafieldDefinitions.nodes[0];
}

const getMetafieldQuery = `#graphql
query getMetafieldDefinition($key: String!, $namespace: String!, $ownerType: MetafieldOwnerType!) {
  metafieldDefinitions(first: 1, key: $key, namespace: $namespace, ownerType: $ownerType) {
    nodes {
      id
      name
      namespace
      ownerType
    }
  }
}
`;



async function createMetafield(admin: AdminApiContext<ShopifyRestResources>, metafeild_data: {
  key: string,
  name: string,
  namespace: string,
  ownerType: string,
  type: string
}) {

  console.log("START CREATING METAFIELD");
  const {key, name, namespace, ownerType, type} = metafeild_data

  const response = await admin.graphql(createMetafieldMutation, {
    variables: {
      definition: {
        access: {
          customerAccount: "READ_WRITE",
          admin: "MERCHANT_READ_WRITE"
        },
        key: key,
        name: name,
        namespace: namespace,
        ownerType: ownerType,
        type: type,
      },
    },
  });

  console.log("RESULT METAFIELD CREATED", response);

  const json = await response.json();
  console.log(JSON.stringify(json, null, 2));
}

const createMetafieldMutation = `#graphql
mutation metafieldDefinitionCreate($definition: MetafieldDefinitionInput!) {
  metafieldDefinitionCreate(definition: $definition) {
    createdDefinition {
      key
      namespace
    }
    userErrors {
      field
      message
    }
  }
}
`;
