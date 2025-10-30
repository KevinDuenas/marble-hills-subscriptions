import { useState, useEffect } from "react";
import { useLoaderData, useFetcher } from "@remix-run/react";
import {
  Page,
  Layout,
  Card,
  FormLayout,
  TextField,
  Button,
  Banner,
  Text,
  BlockStack,
  Toast,
  InlineStack,
  Badge,
  Divider,
  Box
} from "@shopify/polaris";
import { TitleBar } from "@shopify/app-bridge-react";

export const loader = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { admin } = await authenticate.admin(request);

  // Hardcoded Group IDs from your setup
  const groupIds = [
    "gid://shopify/SellingPlanGroup/1078755372", // 5% discount group
    "gid://shopify/SellingPlanGroup/1078788140"  // 10% discount group
  ];

  try {
    const sellingPlanGroups = [];

    // Query each group individually
    for (const groupId of groupIds) {
      try {
        const response = await admin.graphql(`
          query getSellingPlanGroup($id: ID!) {
            sellingPlanGroup(id: $id) {
              id
              name
              merchantCode
              description
              sellingPlans(first: 20) {
                edges {
                  node {
                    id
                    name
                    options
                    position
                    billingPolicy {
                      ... on SellingPlanRecurringBillingPolicy {
                        interval
                        intervalCount
                      }
                    }
                    pricingPolicies {
                      ... on SellingPlanFixedPricingPolicy {
                        adjustmentType
                        adjustmentValue {
                          ... on SellingPlanPricingPolicyPercentageValue {
                            percentage
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          }
        `, {
          variables: { id: groupId }
        });

        const data = await response.json();

        if (data.data?.sellingPlanGroup) {
          sellingPlanGroups.push(data.data.sellingPlanGroup);
        }
      } catch (err) {
        console.error(`Error loading group ${groupId}:`, err);
      }
    }

    return { sellingPlanGroups };
  } catch (error) {
    console.error("Error loading selling plans:", error);
    return { sellingPlanGroups: [], error: error.message };
  }
};

export const action = async ({ request }) => {
  const { authenticate } = await import("../shopify.server");
  const { admin } = await authenticate.admin(request);
  const formData = await request.formData();
  const intent = formData.get("intent");

  try {
    if (intent === "update-plan-name") {
      const groupId = formData.get("groupId");
      const planId = formData.get("planId");
      const newName = formData.get("newName");

      if (!groupId || !planId || !newName) {
        return {
          success: false,
          error: "Missing required fields"
        };
      }

      // Update the selling plan name
      const response = await admin.graphql(`
        mutation updateSellingPlanGroup($id: ID!, $input: SellingPlanGroupInput!) {
          sellingPlanGroupUpdate(id: $id, input: $input) {
            sellingPlanGroup {
              id
              name
              sellingPlans(first: 20) {
                edges {
                  node {
                    id
                    name
                  }
                }
              }
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          id: groupId,
          input: {
            sellingPlansToUpdate: [
              {
                id: planId,
                name: newName
              }
            ]
          }
        }
      });

      const result = await response.json();

      if (result.data?.sellingPlanGroupUpdate?.userErrors?.length > 0) {
        return {
          success: false,
          error: result.data.sellingPlanGroupUpdate.userErrors.map(e => e.message).join(', ')
        };
      }

      return {
        success: true,
        message: "Selling plan name updated successfully"
      };
    }

    if (intent === "update-group-name") {
      const groupId = formData.get("groupId");
      const newName = formData.get("newName");

      if (!groupId || !newName) {
        return {
          success: false,
          error: "Missing required fields"
        };
      }

      const response = await admin.graphql(`
        mutation updateSellingPlanGroup($id: ID!, $input: SellingPlanGroupInput!) {
          sellingPlanGroupUpdate(id: $id, input: $input) {
            sellingPlanGroup {
              id
              name
            }
            userErrors {
              field
              message
            }
          }
        }
      `, {
        variables: {
          id: groupId,
          input: {
            name: newName
          }
        }
      });

      const result = await response.json();

      if (result.data?.sellingPlanGroupUpdate?.userErrors?.length > 0) {
        return {
          success: false,
          error: result.data.sellingPlanGroupUpdate.userErrors.map(e => e.message).join(', ')
        };
      }

      return {
        success: true,
        message: "Selling plan group name updated successfully"
      };
    }

    return { error: "Invalid action", success: false };
  } catch (error) {
    console.error("Error updating selling plan:", error);
    return {
      error: error.message || "Server error",
      success: false
    };
  }
};

export default function SellingPlansPage() {
  const { sellingPlanGroups, error: loaderError } = useLoaderData();
  const fetcher = useFetcher();
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState("");
  const [toastError, setToastError] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [editingGroup, setEditingGroup] = useState(null);
  const [newName, setNewName] = useState("");

  const isLoading = fetcher.state === "submitting";

  useEffect(() => {
    if (fetcher.data?.success) {
      setToastMessage(fetcher.data.message);
      setToastError(false);
      setShowToast(true);
      setEditingPlan(null);
      setEditingGroup(null);
      setNewName("");

      // Reload the page to get fresh data
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    } else if (fetcher.data?.error) {
      setToastMessage(fetcher.data.error);
      setToastError(true);
      setShowToast(true);
    }
  }, [fetcher.data]);

  const handleEditPlan = (groupId, planId, currentName) => {
    setEditingPlan({ groupId, planId });
    setNewName(currentName);
  };

  const handleEditGroup = (groupId, currentName) => {
    setEditingGroup(groupId);
    setNewName(currentName);
  };

  const handleSavePlan = () => {
    if (!editingPlan || !newName.trim()) return;

    fetcher.submit(
      {
        intent: "update-plan-name",
        groupId: editingPlan.groupId,
        planId: editingPlan.planId,
        newName: newName.trim()
      },
      { method: "POST" }
    );
  };

  const handleSaveGroup = () => {
    if (!editingGroup || !newName.trim()) return;

    fetcher.submit(
      {
        intent: "update-group-name",
        groupId: editingGroup,
        newName: newName.trim()
      },
      { method: "POST" }
    );
  };

  const handleCancel = () => {
    setEditingPlan(null);
    setEditingGroup(null);
    setNewName("");
  };

  const getDiscountInfo = (plan) => {
    const pricingPolicy = plan.pricingPolicies?.[0];
    if (pricingPolicy?.adjustmentValue?.percentage) {
      return `${pricingPolicy.adjustmentValue.percentage}% off`;
    }
    return null;
  };

  const getFrequencyInfo = (plan) => {
    const billing = plan.billingPolicy;
    if (billing?.interval && billing?.intervalCount) {
      return `Every ${billing.intervalCount} ${billing.interval.toLowerCase()}${billing.intervalCount > 1 ? 's' : ''}`;
    }
    return null;
  };

  return (
    <Page>
      <TitleBar title="Selling Plans Management" />

      {showToast && (
        <Toast
          content={toastMessage}
          error={toastError}
          onDismiss={() => setShowToast(false)}
        />
      )}

      <Layout>
        <Layout.Section>
          <Banner title="Manage Selling Plan Names" status="info">
            <p>
              Customize how subscription plans appear to customers in the cart and checkout.
              The names you set here will be displayed to customers during checkout.
            </p>
            <p style={{ marginTop: '8px' }}>
              <strong>Groups Found:</strong> {sellingPlanGroups.length}
              {sellingPlanGroups.length === 0 && " - If you see 0, the selling plans may have been created by another app and cannot be edited via API."}
            </p>
          </Banner>
        </Layout.Section>

        {loaderError && (
          <Layout.Section>
            <Banner title="Error loading selling plans" status="critical">
              <p>{loaderError}</p>
            </Banner>
          </Layout.Section>
        )}

        {sellingPlanGroups.length === 0 && !loaderError && (
          <Layout.Section>
            <Banner title="No Selling Plans Found" status="warning">
              <p>
                No selling plan groups were found using the specified Group IDs (1078755372 and 1078788140).
                This likely means:
              </p>
              <ul style={{ marginTop: '8px', marginLeft: '20px' }}>
                <li>The selling plans were created by Shopify's Subscriptions app (not accessible via your app's API)</li>
                <li>The Group IDs are incorrect</li>
                <li>Your app doesn't have the necessary permissions</li>
              </ul>
              <p style={{ marginTop: '8px' }}>
                <strong>Solution:</strong> Edit the selling plan names manually in Shopify Admin → Products → Subscriptions
              </p>
            </Banner>
          </Layout.Section>
        )}

        {sellingPlanGroups.map((group, index) => {
          const isFirstGroup = index === 0;
          const discountLabel = isFirstGroup ? "5% Discount Group" : "10% Discount Group";

          return (
          <Layout.Section key={group.id}>
            <Card>
              <BlockStack gap="400">
                <Box>
                  <InlineStack align="space-between" blockAlign="center">
                    <BlockStack gap="200">
                      <InlineStack gap="200" blockAlign="center">
                        <Text variant="headingMd" as="h2">
                          {group.name || "Unnamed Group"}
                        </Text>
                        <Badge tone={isFirstGroup ? "info" : "success"}>{discountLabel}</Badge>
                      </InlineStack>
                      {group.merchantCode && (
                        <Text variant="bodySm" tone="subdued">
                          Code: {group.merchantCode}
                        </Text>
                      )}
                      <Text variant="bodySm" tone="subdued">
                        Group ID: {group.id.split('/').pop()}
                      </Text>
                    </BlockStack>
                    <Button
                      onClick={() => handleEditGroup(group.id, group.name)}
                      disabled={editingGroup === group.id}
                    >
                      Edit Group Name
                    </Button>
                  </InlineStack>

                  {editingGroup === group.id && (
                    <Box paddingBlockStart="400">
                      <FormLayout>
                        <TextField
                          label="Group Name"
                          value={newName}
                          onChange={setNewName}
                          autoComplete="off"
                          helpText="This is the main group name for this set of plans"
                        />
                        <InlineStack gap="200">
                          <Button
                            primary
                            onClick={handleSaveGroup}
                            loading={isLoading}
                            disabled={!newName.trim()}
                          >
                            Save
                          </Button>
                          <Button onClick={handleCancel}>Cancel</Button>
                        </InlineStack>
                      </FormLayout>
                    </Box>
                  )}
                </Box>

                <Divider />

                <BlockStack gap="300">
                  <Text variant="headingSm" as="h3">
                    Individual Plans ({group.sellingPlans.edges.length})
                  </Text>

                  {group.sellingPlans.edges.map(({ node: plan }) => {
                    const isEditing = editingPlan?.planId === plan.id;
                    const discount = getDiscountInfo(plan);
                    const frequency = getFrequencyInfo(plan);

                    return (
                      <Card key={plan.id}>
                        <BlockStack gap="300">
                          <InlineStack align="space-between" blockAlign="start">
                            <BlockStack gap="200">
                              <InlineStack gap="200" blockAlign="center">
                                <Text variant="bodyMd" fontWeight="semibold">
                                  {plan.name || "Unnamed Plan"}
                                </Text>
                                {discount && <Badge tone="success">{discount}</Badge>}
                              </InlineStack>

                              {frequency && (
                                <Text variant="bodySm" tone="subdued">
                                  {frequency}
                                </Text>
                              )}

                              <Text variant="bodySm" tone="subdued">
                                ID: {plan.id.split('/').pop()}
                              </Text>
                            </BlockStack>

                            <Button
                              onClick={() => handleEditPlan(group.id, plan.id, plan.name)}
                              disabled={isEditing}
                            >
                              Edit Name
                            </Button>
                          </InlineStack>

                          {isEditing && (
                            <Box paddingBlockStart="200">
                              <FormLayout>
                                <TextField
                                  label="Plan Name (shown to customers)"
                                  value={newName}
                                  onChange={setNewName}
                                  autoComplete="off"
                                  helpText="Example: 'Entrega cada 2 semanas - 5% descuento'"
                                  placeholder="Deliver every 2 weeks, 5% off"
                                />
                                <InlineStack gap="200">
                                  <Button
                                    primary
                                    onClick={handleSavePlan}
                                    loading={isLoading}
                                    disabled={!newName.trim()}
                                  >
                                    Save
                                  </Button>
                                  <Button onClick={handleCancel}>Cancel</Button>
                                </InlineStack>
                              </FormLayout>
                            </Box>
                          )}
                        </BlockStack>
                      </Card>
                    );
                  })}
                </BlockStack>
              </BlockStack>
            </Card>
          </Layout.Section>
          );
        })}

        <Layout.Section>
          <Card>
            <BlockStack gap="200">
              <Text variant="headingSm" as="h3">
                Quick Reference
              </Text>
              <Text variant="bodySm" tone="subdued">
                • Names set here appear in the cart and checkout
              </Text>
              <Text variant="bodySm" tone="subdued">
                • Use clear language like "Entrega cada 2 semanas - 5% descuento"
              </Text>
              <Text variant="bodySm" tone="subdued">
                • Changes take effect immediately for new carts
              </Text>
            </BlockStack>
          </Card>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
