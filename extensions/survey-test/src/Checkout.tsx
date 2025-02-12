import {
  reactExtension,
  BlockStack,
  View,
  Heading,
  Text,
  ChoiceList,
  Choice,
  Button,
  useApi,
} from '@shopify/ui-extensions-react/checkout';
import { useState } from 'react';

const KEY = "survey"

// Allow the attribution survey to display on the thank you page.
export default reactExtension(
  "purchase.thank-you.block.render",
  async () => {

    return (
      <Attribution />
    );
  },
);
interface Props {
}

function Attribution(props: Props) {
  const api = useApi();

  let orderId: any
  if('orderConfirmation' in api){
    orderId = (api.orderConfirmation as any)?.current?.order.id;

    if (orderId.startsWith("gid://shopify/OrderIdentity/")) {
      orderId = orderId.replace("OrderIdentity", "Order");
    }

    console.log("ORDER ID FOUND:", orderId);

  }else{
    console.log("ORDER ID NOT FOUND");
  }

  const { shop } = api

  const [submitted, setSubmitted] = useState(false);
  const [survey, setSurvey] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    setLoading(true);
    let preferences = await setCustomerPreferences(shop.storefrontUrl, orderId, survey);

    if (preferences){
      setSubmitted(true)
    }

    setLoading(false)
  }

  return (
    <>
    <Heading>{survey}</Heading>
    <Survey title="How did you hear about us ?" description="" onSubmit={handleSubmit} loading={loading} submitted={submitted}>
      <ChoiceList
        name="sale-attribution"
        value={survey}
        onChange={(value) => setSurvey(Array.isArray(value) ? value[0] : value)}
      >
        <BlockStack>
          <Choice id="tv">TV</Choice>
          <Choice id="podcast">Podcast</Choice>
          <Choice id="family">From a friend or family member</Choice>
          <Choice id="tiktok">Tiktok</Choice>
        </BlockStack>
      </ChoiceList>
    </Survey>
  </>
  );
}


function Survey({
  title,
  description,
  onSubmit,
  children,
  loading,
  submitted
}) {
  if (submitted) {
    return (
      <View border="base" padding="base" borderRadius="base">
        <BlockStack>
          <Heading>Thanks for your feedback!</Heading>
          <Text>Your response has been submitted</Text>
        </BlockStack>
      </View>
    );
  }

  return (
    <View border="base" padding="base" borderRadius="base">
      <BlockStack>
        <Heading>{title}</Heading>
        <Text>{description}</Text>
        {children}
        <Button kind="secondary" onPress={onSubmit} loading={loading}>
          Submit feedback
        </Button>
      </BlockStack>
    </View>
  );
}



async function getCustomerPreferences(shop: string) {
  const response = await fetch(
    `${shop}/api/2024-10/graphql.json`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `query preferences($key: String!, $namespace: String!) {
          customer {
          id
            metafield(namespace: $namespace, key: $key) {
              value
            }
          }
        }`,
        variables: {
          key: KEY,
          namespace: "$app:preferences",
        },
      }),
    },
  );

  const data = await response.json();

  return data
}

async function setCustomerPreferences(
  shop: string,
  orderId: string,
  value?: string,
) {
  let res = await fetch(
    // /admin missing but if i add it i receive CORS error :(
    `${shop}/api/2025-01/graphql.json`,
    {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      query: `mutation MetafieldsSet($metafields: [MetafieldsSetInput!]!) {
        metafieldsSet(metafields: $metafields) {
          metafields {
            key
            namespace
            value
            createdAt
            updatedAtreturn true
          }
          userErrors {
            field
            message
            code
          }
        }
      }`,
      variables: {
        metafields: [
          {
            key: KEY,
            namespace: "$app:preferences",
            ownerId: orderId,
            type: "single_line_text_field",
            value: value ?? "",
          },
        ],
      },
    }),
  });

  const data = await res.json();
  if (data.errors) {
      console.error("GraphQL Errors:", data.errors);

      return false
  } else {
      console.log("GraphQL Success:", data.data);
      // Process the successful response

      return true
  }
}
