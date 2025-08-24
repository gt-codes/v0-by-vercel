import { Action, ActionPanel, Icon, Keyboard, List } from "@raycast/api";
import { useV0Api } from "../hooks/useV0Api";
import type { FindDeploymentsResponse, VersionSummaryList } from "../types";
import { useActiveProfile } from "../hooks/useActiveProfile";
import { useMemo, useState } from "react";

export default function ChatDeploymentsList(props: { projectId: string; chatId: string; versionId: string }) {
  const { projectId, chatId, versionId } = props;
  const { activeProfileApiKey, activeProfileDefaultScope, isLoadingProfileDetails } = useActiveProfile();
  const [selectedVersionId, setSelectedVersionId] = useState<string>(versionId);

  // Fetch versions for this chat to populate the dropdown
  const {
    isLoading: isLoadingVersions,
    data: versionsData,
    error: versionsError,
  } = useV0Api<VersionSummaryList>(
    activeProfileApiKey ? `https://api.v0.dev/v1/chats/${encodeURIComponent(chatId)}/versions` : "",
    {
      method: "GET",
      cache: "no-store",
      headers: {
        Authorization: `Bearer ${activeProfileApiKey}`,
        "x-scope": activeProfileDefaultScope || "",
      },
      execute: !!activeProfileApiKey && !isLoadingProfileDetails,
      keepPreviousData: true,
    },
  );

  // Re-fetch deployments whenever the selected version changes
  const { isLoading, data, error } = useV0Api<FindDeploymentsResponse>(
    activeProfileApiKey
      ? `https://api.v0.dev/v1/deployments?projectId=${encodeURIComponent(projectId)}&chatId=${encodeURIComponent(chatId)}&versionId=${encodeURIComponent(selectedVersionId)}`
      : "",
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${activeProfileApiKey}`,
        "x-scope": activeProfileDefaultScope || "",
      },
      execute: !!activeProfileApiKey && !isLoadingProfileDetails,
      keepPreviousData: true,
    },
  );

  const versions = versionsData?.data || [];
  const sortedVersions = useMemo(() => {
    return [...versions].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
  }, [versions]);
  const versionDropdownItems = useMemo(() => {
    if (!sortedVersions.length) {
      return [<List.Dropdown.Item key="none" value={selectedVersionId} title={selectedVersionId} />];
    }
    const items = [] as Array<React.ReactElement>;
    for (let i = sortedVersions.length - 1; i >= 0; i -= 1) {
      const v = sortedVersions[i];
      const label = `v${i + 1}`;
      items.push(<List.Dropdown.Item key={v.id} value={v.id} title={`${label} - ${v.id}`} />);
    }
    return items;
  }, [sortedVersions, selectedVersionId]);

  const selectedVersionLabel = useMemo(() => {
    if (!sortedVersions.length) return selectedVersionId;
    const idx = sortedVersions.findIndex((v) => v.id === selectedVersionId);
    if (idx === -1) return selectedVersionId;
    const labelNum = idx + 1;
    return `v${labelNum}`;
  }, [sortedVersions, selectedVersionId]);

  if (error || versionsError) {
    return (
      <List navigationTitle="Deployments">
        <List.EmptyView title={`Error: ${((error || versionsError) as Error)?.message}`} />
      </List>
    );
  }

  if (isLoading || isLoadingVersions || isLoadingProfileDetails) {
    return (
      <List navigationTitle="Deployments">
        <List.EmptyView title="Fetching deployments..." />
      </List>
    );
  }

  const deployments = data?.data ?? [];
  console.log({ deployments, selectedVersionId });
  return (
    <List
      navigationTitle="Deployments"
      searchBarPlaceholder="Search deployments..."
      searchBarAccessory={
        <List.Dropdown
          id="versionFilter"
          tooltip="Filter by Version"
          value={selectedVersionId}
          onChange={(newValue) => setSelectedVersionId(newValue)}
          storeValue
          isLoading={isLoadingVersions}
        >
          {versionDropdownItems}
        </List.Dropdown>
      }
    >
      {deployments.map((d) => (
        <List.Item
          key={d.id}
          title={d.id.replace("dpl_", "").slice(0, 9)}
          accessories={[]}
          actions={
            <ActionPanel>
              {d.webUrl && <Action.OpenInBrowser title="Open Deployment" url={d.webUrl} icon={Icon.Globe} />}
              <Action.OpenInBrowser title="View on Vercel" url={d.inspectorUrl} icon={Icon.Globe} />
              <Action.CopyToClipboard
                content={d.id}
                icon={Icon.CopyClipboard}
                title="Copy Deployment ID"
                shortcut={Keyboard.Shortcut.Common.Copy}
              />
              <Action
                title="Log Version Info"
                onAction={() => {
                  console.log("Selected version:", {
                    versionLabel: selectedVersionLabel,
                    versionId: selectedVersionId,
                  });
                }}
              />
            </ActionPanel>
          }
        />
      ))}
    </List>
  );
}
