import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Server,
  Wallet,
  CheckCircle2,
  Edit,
  Trash2,
  Download,
  AlertTriangle,
  Users,
  User,
} from "lucide-react";
import { useBounty } from "@/lib/bounty-context";
import { formatAddress } from "@/lib/utils";
import { ZcashParams } from "@/lib/types";
import { ImportWalletModal } from "./import-modal";
import { useToast } from "@/hooks/use-toast";

interface GlobalSettingsModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

function partitionWallets(params: ZcashParams[], teams: any[]) {
  const teamWallets: (ZcashParams & { teamName?: string })[] = [];
  const personalWallets: ZcashParams[] = [];

  for (const p of params) {
    if (p.isTeam && p.teamId) {
      const team = teams.find((t) => t.id === p.teamId);
      teamWallets.push({ ...p, teamName: team?.name ?? `Team ${p.teamId}` });
    } else {
      personalWallets.push(p);
    }
  }

  return { teamWallets, personalWallets };
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function WalletRow({
  config,
  isActive,
  isSettingDefault,
  isUpdating,
  onEdit,
  onDelete,
  onSetActive,
  teamName,
}: {
  config: ZcashParams;
  isActive: boolean;
  isSettingDefault: string | null;
  isUpdating: boolean;
  onEdit: (c: ZcashParams) => void;
  onDelete: (c: ZcashParams) => void;
  onSetActive: (c: ZcashParams) => void;
  teamName?: string;
}) {
  const name = config.accountName || "Unnamed Account";
  const initials = getInitials(name);

  return (
    <div
      className={`flex items-center gap-2 sm:gap-3 px-2.5 sm:px-3 py-2.5 rounded-lg border transition-colors ${
        isActive
          ? "border-emerald-300 dark:border-emerald-700 bg-emerald-50/40 dark:bg-emerald-950/20"
          : "border-border hover:bg-muted/50"
      }`}
    >
      {/* Avatar */}
      <div
        className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium shrink-0 ${
          teamName
            ? "bg-violet-100 text-violet-700 dark:bg-violet-900/50 dark:text-violet-300"
            : "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300"
        }`}
      >
        {initials}
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-sm font-medium truncate max-w-[120px] sm:max-w-none">
            {name}
          </span>
          {isActive && (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shrink-0" />
              <span className="text-xs text-emerald-600 dark:text-emerald-400">
                Active
              </span>
            </>
          )}
          {config.isDefault && !isActive && (
            <Badge className="text-[10px] px-1.5 py-0 h-4 bg-green-100 text-green-700 border-green-200 dark:bg-green-900 dark:text-green-300 dark:border-green-700">
              Default
            </Badge>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 text-xs text-muted-foreground flex-wrap">
          {teamName && (
            <>
              <span className="text-violet-600 dark:text-violet-400 truncate max-w-[80px] sm:max-w-none">
                {teamName}
              </span>
              <span className="opacity-40">·</span>
            </>
          )}
          <span
            className={
              config.chain === "mainnet"
                ? "text-green-600 dark:text-green-400"
                : "text-blue-600 dark:text-blue-400"
            }
          >
            {config.chain || "mainnet"}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 shrink-0">
        {!isActive && (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onSetActive(config)}
            disabled={isSettingDefault === config.accountName}
            className="text-xs h-7 px-1.5 sm:px-2 hidden xs:flex"
          >
            {isSettingDefault === config.accountName
              ? "Setting…"
              : "Set active"}
          </Button>
        )}
        {/* On very small screens show a compact "activate" icon button instead */}
        {!isActive && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onSetActive(config)}
            disabled={isSettingDefault === config.accountName}
            className="h-7 w-7 flex xs:hidden"
            title="Set active"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
          </Button>
        )}
        <Button
          size="icon"
          variant="ghost"
          onClick={() => onEdit(config)}
          className="h-7 w-7"
        >
          <Edit className="w-3.5 h-3.5" />
        </Button>
        {!teamName && (
          <Button
            size="icon"
            variant="ghost"
            onClick={() => onDelete(config)}
            className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
            disabled={isUpdating}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        )}
      </div>
    </div>
  );
}

export function GlobalSettingsModal({
  open,
  onOpenChange,
}: GlobalSettingsModalProps) {
  const {
    zcashParams,
    address,
    updateZcashParams,
    deleteZcashParams,
    setDefaultWallet,
    teams,
  } = useBounty();
  const { toast } = useToast();

  const [isUpdating, setIsUpdating] = useState(false);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedConfig, setSelectedConfig] = useState<ZcashParams | null>(
    null,
  );
  const [configToDelete, setConfigToDelete] = useState<ZcashParams | null>(
    null,
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isSettingDefault, setIsSettingDefault] = useState<string | null>(null);

  const [editForm, setEditForm] = useState({
    accountName: "",
    chain: "mainnet",
    serverUrl: "https://zec.rocks:443",
  });

  useEffect(() => {
    if (open) {
      setIsLoading(true);
      try {
        if (zcashParams && zcashParams.length > 0) {
          const defaultParam =
            zcashParams.find((p) => p.isDefault) ??
            zcashParams[zcashParams.length - 1];
          setSelectedConfig(defaultParam);
        }
      } finally {
        setIsLoading(false);
      }
    }
  }, [open, zcashParams]);

  const { teamWallets, personalWallets } = partitionWallets(
    zcashParams ?? [],
    teams ?? [],
  );

  const activeTeamName =
    selectedConfig?.isTeam && selectedConfig?.teamId
      ? ((teams ?? []).find((t) => t.id === selectedConfig.teamId)?.name ??
        `Team ${selectedConfig.teamId}`)
      : undefined;

  const activeInitials = selectedConfig
    ? getInitials(selectedConfig.accountName || "Unnamed Account")
    : "?";

  const handleEditClick = (config: ZcashParams) => {
    setSelectedConfig(config);
    setEditForm({
      accountName: config.accountName || "",
      chain: config.chain || "mainnet",
      serverUrl: config.serverUrl || "https://zec.rocks:443",
    });
    setIsEditDialogOpen(true);
  };

  const handleDeleteClick = (config: ZcashParams) => {
    setConfigToDelete(config);
    setIsDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!configToDelete) return;
    setIsUpdating(true);
    try {
      await deleteZcashParams(configToDelete.accountName);
      toast({
        title: "Success",
        description: `Configuration "${configToDelete.accountName}" deleted.`,
      });
      if (selectedConfig?.id === configToDelete.id) {
        const remaining = zcashParams.filter((p) => p.id !== configToDelete.id);
        setSelectedConfig(remaining.length > 0 ? remaining[0] : null);
      }
      setIsDeleteDialogOpen(false);
      setConfigToDelete(null);
    } catch {
      toast({
        title: "Error",
        description: "Failed to delete configuration.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleChainChange = (value: string) => {
    setEditForm((prev) => ({
      ...prev,
      chain: value,
      serverUrl:
        value === "mainnet"
          ? "https://zec.rocks:443"
          : "https://testnet.zec.rocks:443",
    }));
  };

  const handleEditConfig = async () => {
    if (!selectedConfig) return;
    setIsUpdating(true);
    try {
      await updateZcashParams(selectedConfig.accountName, {
        accountName: editForm.accountName,
        chain: editForm.chain,
        serverUrl: editForm.serverUrl,
      });
      toast({ title: "Success", description: "Configuration updated." });
      setIsEditDialogOpen(false);
    } catch {
      toast({
        title: "Error",
        description: "Failed to update configuration.",
        variant: "destructive",
      });
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSetActive = async (config: ZcashParams) => {
    setIsSettingDefault(config.accountName);
    try {
      await setDefaultWallet(config.accountName, config.teamId ?? undefined);
      setSelectedConfig(config);
      toast({
        title: "Active wallet updated",
        description: `"${config.accountName}" is now the active wallet.`,
      });
    } catch {
      toast({
        title: "Error",
        description: "Failed to set active wallet.",
        variant: "destructive",
      });
    } finally {
      setIsSettingDefault(null);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="flex flex-col w-full sm:max-w-2xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto p-4 sm:p-6">
          <DialogHeader>
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DialogTitle className="text-base sm:text-lg font-medium flex items-center gap-2">
                  <Server className="w-4 h-4 text-muted-foreground shrink-0" />
                  Global settings
                </DialogTitle>
                <DialogDescription className="mt-0.5 text-xs sm:text-sm">
                  Manage Zcash wallet configurations
                </DialogDescription>
              </div>
              <Button
                onClick={() => setIsImportDialogOpen(true)}
                size="sm"
                className="gap-1.5 shrink-0 text-xs sm:text-sm h-8 sm:h-9 px-2.5 sm:px-3"
              >
                <Download className="w-3.5 h-3.5" />
                <span className="hidden xs:inline">Import wallet</span>
                <span className="xs:hidden">Import</span>
              </Button>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-10">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-7 w-7 border-b-2 border-primary mx-auto" />
                <p className="text-sm text-muted-foreground">
                  Loading settings...
                </p>
              </div>
            </div>
          ) : (
            <div className="space-y-4 sm:space-y-5 pt-1">
              {/* ── Active wallet banner ── */}
              {selectedConfig ? (
                <div>
                  <div className="flex items-center gap-1.5 mb-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Active wallet
                    </span>
                  </div>

                  <div className="rounded-xl border border-border overflow-hidden">
                    {/* Dark banner */}
                    <div className="bg-primary px-4 py-3 flex items-center justify-between gap-3 flex-wrap">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-white/15 dark:bg-background flex items-center justify-center text-sm font-medium text-white shrink-0">
                          {activeInitials}
                        </div>
                        <div>
                          <p className="text-sm font-medium text-background">
                            {selectedConfig.accountName || "Unnamed Account"}
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                            {activeTeamName && (
                              <span className="hidden imd:block text-xs px-1.5 py-0.5 rounded-full bg-violet-500/25 text-violet-300 dark:bg-violet-700/25 dark:text-violet-900">
                                {activeTeamName}
                              </span>
                            )}
                            <span
                              className={`text-xs px-1.5 py-0.5 rounded-full ${
                                selectedConfig.chain === "mainnet"
                                  ? "bg-green-500/25 text-green-300 dark:bg-green-700/25 dark:text-green-900"
                                  : "bg-blue-500/25 text-blue-300 dark:bg-blue-700/25 dark:text-blue-900"
                              }`}
                            >
                              {selectedConfig.chain || "mainnet"}
                            </span>
                            <span className="hidden imd:block text-xs text-white/50 dark:text-black/50">
                              {selectedConfig.serverUrl || "zec.rocks:443"}
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleEditClick(selectedConfig)}
                        className="bg-background dark:bg-background border-white/20 hover:bg-white/20 hover:text-white text-xs h-7 shrink-0"
                      >
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                    </div>

                    {/* Details grid — 1 col on mobile, 2 cols on sm+ */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-px bg-border">
                      <div className="bg-background px-3 sm:px-4 py-2.5 sm:py-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Account name
                        </p>
                        <p className="text-sm font-medium truncate">
                          {selectedConfig.accountName || "Unnamed Account"}
                        </p>
                      </div>
                      <div className="bg-background px-3 sm:px-4 py-2.5 sm:py-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Network
                        </p>
                        <p
                          className={`text-sm font-medium ${
                            selectedConfig.chain === "mainnet"
                              ? "text-green-600 dark:text-green-400"
                              : "text-blue-600 dark:text-blue-400"
                          }`}
                        >
                          {selectedConfig.chain === "mainnet"
                            ? "Mainnet"
                            : "Testnet"}
                        </p>
                      </div>
                      <div className="bg-background px-3 sm:px-4 py-2.5 sm:py-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Server URL
                        </p>
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {selectedConfig.serverUrl || "https://zec.rocks:443"}
                        </p>
                      </div>
                      <div className="bg-background px-3 sm:px-4 py-2.5 sm:py-3">
                        <p className="text-xs text-muted-foreground mb-1">
                          Wallet address
                        </p>
                        <p className="text-xs font-mono text-muted-foreground truncate">
                          {formatAddress(address || "")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null}

              {/* ── Personal wallets ── */}
              {personalWallets.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-border">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Personal
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {personalWallets.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {personalWallets.map((config) => (
                      <WalletRow
                        key={config.id}
                        config={config}
                        isActive={config.id === selectedConfig?.id}
                        isSettingDefault={isSettingDefault}
                        isUpdating={isUpdating}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                        onSetActive={handleSetActive}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Team wallets ── */}
              {teamWallets.length > 0 && (
                <div>
                  <div className="flex items-center gap-1.5 mb-2 pb-2 border-b border-border">
                    <Users className="w-3.5 h-3.5 text-muted-foreground" />
                    <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                      Teams
                    </span>
                    <span className="text-xs text-muted-foreground">
                      · {teamWallets.length}
                    </span>
                  </div>
                  <div className="space-y-1.5">
                    {teamWallets.map((config) => (
                      <WalletRow
                        key={config.id}
                        config={config}
                        isActive={config.id === selectedConfig?.id}
                        isSettingDefault={isSettingDefault}
                        isUpdating={isUpdating}
                        onEdit={handleEditClick}
                        onDelete={handleDeleteClick}
                        onSetActive={handleSetActive}
                        teamName={config.teamName}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* ── Empty state ── */}
              {personalWallets.length === 0 && teamWallets.length === 0 && (
                <div className="border rounded-lg p-8 sm:p-10 text-center text-muted-foreground">
                  <Wallet className="w-8 h-8 mx-auto mb-3 opacity-25" />
                  <p className="text-sm">No wallets configured yet.</p>
                  <p className="text-xs mt-1 opacity-70">
                    Import a wallet to get started.
                  </p>
                </div>
              )}

              <div className="flex justify-end pt-2 border-t border-border">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onOpenChange(false)}
                >
                  Close
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Configuration Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-md p-4 sm:p-6">
          <DialogHeader>
            <DialogTitle>Edit Zcash configuration</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="edit-account-name">Account name</Label>
              <Input
                id="edit-account-name"
                value={editForm.accountName}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    accountName: e.target.value,
                  }))
                }
                placeholder="e.g., My Wallet"
                className="mt-1.5"
              />
            </div>
            <div>
              <Label htmlFor="edit-chain">Network chain</Label>
              <Select value={editForm.chain} onValueChange={handleChainChange}>
                <SelectTrigger className="mt-1.5">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="mainnet">Mainnet</SelectItem>
                  <SelectItem value="testnet">Testnet</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="edit-server-url">Server URL</Label>
              <Input
                id="edit-server-url"
                value={editForm.serverUrl}
                onChange={(e) =>
                  setEditForm((prev) => ({
                    ...prev,
                    serverUrl: e.target.value,
                  }))
                }
                placeholder="https://zec.rocks:443"
                className="mt-1.5"
              />
            </div>
            <div className="flex flex-col-reverse xs:flex-row justify-end gap-2 pt-1">
              <Button
                variant="outline"
                onClick={() => setIsEditDialogOpen(false)}
                disabled={isUpdating}
                className="w-full xs:w-auto"
              >
                Cancel
              </Button>
              <Button
                onClick={handleEditConfig}
                disabled={isUpdating}
                className="w-full xs:w-auto"
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                {isUpdating ? "Saving..." : "Save changes"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={isDeleteDialogOpen}
        onOpenChange={setIsDeleteDialogOpen}
      >
        <AlertDialogContent className="w-full max-w-[calc(100vw-2rem)] sm:max-w-lg p-4 sm:p-6">
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="w-5 h-5 text-destructive shrink-0" />
              Delete Zcash configuration
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete the configuration for{" "}
              <span className="font-semibold">
                "{configToDelete?.accountName}"
              </span>
              ?
              <div className="mt-3 p-3 bg-destructive/10 border border-destructive/20 rounded-md">
                <p className="text-sm text-destructive font-medium">
                  ⚠️ Warning: This action cannot be undone!
                </p>
                <p className="text-sm text-muted-foreground mt-1">
                  This will permanently delete the wallet data folder and all
                  associated files from the server.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="flex-col-reverse sm:flex-row gap-2 sm:gap-0">
            <AlertDialogCancel
              disabled={isUpdating}
              className="w-full sm:w-auto mt-0"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              disabled={isUpdating}
              className="bg-destructive hover:bg-destructive/90 w-full sm:w-auto"
            >
              {isUpdating ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Import Wallet Dialog */}
      <ImportWalletModal
        open={isImportDialogOpen}
        onOpenChange={setIsImportDialogOpen}
      />
    </>
  );
}
