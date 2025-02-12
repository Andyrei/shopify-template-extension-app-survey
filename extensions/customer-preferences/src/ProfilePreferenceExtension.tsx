import {
  BlockStack,
  Button,
  Card,
  Form,
  TextField,
  Heading,
  Icon,
  InlineStack,
  Modal,
  reactExtension,
  Text,
  useApi,
} from "@shopify/ui-extensions-react/customer-account";
import { useState } from "react";

// [START setup-targets.extension]
export default reactExtension(
  "customer-account.profile.block.render",
  async () => {
    const { customerId, nickName }  = await getCustomerPreferences();

    return (
      <ProfilePreferenceExtension
        customerId={customerId}
        nickName={nickName}
      />
    );
  },
);
// [END setup-targets.extension]

interface Props {
  customerId: string;
  nickName?: string;
}

function ProfilePreferenceExtension(props: Props) {
  const { i18n, ui } = useApi();
  const [nickName, setNickName] = useState(props.nickName ?? "");

  const handleSubmit = async () => {
    await setCustomerPreferences(props.customerId, nickName);
    ui.overlay.close("edit-preferences-modal");
  };

  const handleCancel = () => {
    ui.overlay.close("edit-preferences-modal");
  };

  // [START build-extension.ui]
  return (
    <Card padding>
      <BlockStack spacing="loose">
        <Heading level={3}>
          <InlineStack>
            <Text>{i18n.translate("preferenceCard.heading")}</Text>
            <Button
              kind="plain"
              accessibilityLabel={i18n.translate("preferenceCard.edit")}
              overlay={
                <Modal
                  id="edit-preferences-modal"
                  padding
                  title={i18n.translate("preferenceCard.modalHeading")}
                >
                  <Form onSubmit={handleSubmit}>
                    <BlockStack>
                      <TextField
                        label={i18n.translate("preferenceCard.nickName.label")}
                        value={nickName}
                        onChange={(value) => setNickName(value)}
                      />
                      <InlineStack blockAlignment="center" inlineAlignment="end">
                        <Button kind="plain" onPress={() => handleCancel()}>
                          {i18n.translate("preferenceCard.cancel")}
                        </Button>
                        <Button accessibilityRole="submit">
                          {i18n.translate("preferenceCard.save")}
                        </Button>
                      </InlineStack>
                    </BlockStack>
                  </Form>
                </Modal>
              }
            >
              <Icon source="pen" size="small" appearance="monochrome" />
            </Button>
          </InlineStack>
        </Heading>
        <BlockStack spacing="none">
          <Text appearance="subdued">
            {i18n.translate("preferenceCard.nickName.label")}
          </Text>
          <Text>{nickName}</Text>
        </BlockStack>
      </BlockStack>
    </Card>
  );
  // [END build-extension.ui]
}

// [START build-extension.get-value]
async function getCustomerPreferences() {
  try {
    const response = await fetch(
      "shopify:customer-account/api/2024-10/graphql.json",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: `query GetCustomerPreferences {
            customer {
              id
              metafield(namespace: "$app:preferences", key: "preference") {
                value
              }
            }
          }`,
        }),
      },
    );

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { data, errors } = await response.json();

    if (errors) {
      console.error('GraphQL Errors:', errors);
      return { customerId: '', nickName: '' };
    }

    if (!data?.customer) {
      console.error('No customer data found');
      return { customerId: '', nickName: '' };
    }

    return {
      customerId: data.customer.id,
      nickName: data.customer.metafield?.value || '',
    };
  } catch (error) {
    console.error('Error fetching customer preferences:', error);
    return { customerId: '', nickName: '' };
  }
}
// [END build-extension.get-value]

// [START write-metafield.mutation]
async function setCustomerPreferences(
  customerId: string,
  nickName?: string,
) {
  try {
    const response = await fetch("shopify:customer-account/api/2024-10/graphql.json", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        query: `mutation setPreferences($metafields: [MetafieldsSetInput!]!) {
          metafieldsSet(metafields: $metafields) {
            userErrors {
              field
              message
            }
            metafields {
              id
              value
            }
          }
        }`,
        variables: {
          metafields: [
            {
              key: "preference",
              namespace: "$app:preferences",
              ownerId: customerId,
              value: nickName ?? "",
              type: "single_line_text_field"
            },
          ],
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const { data, errors } = await response.json();

    if (errors) {
      console.error('GraphQL Errors:', errors);
      throw new Error('Failed to set customer preferences');
    }

    if (data?.metafieldsSet?.userErrors?.length > 0) {
      console.error('Mutation Errors:', data.metafieldsSet.userErrors);
      throw new Error('Failed to set customer preferences');
    }

    return data?.metafieldsSet?.metafields?.[0];
  } catch (error) {
    console.error('Error setting customer preferences:', error);
    throw error;
  }
}
// [END write-metafield.mutation]
