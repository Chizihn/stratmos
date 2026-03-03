"use client";

import { useState } from "react";
import {
  useAccount,
  useConnect,
  useDisconnect,
  useBalance,
  useChainId,
  useSwitchChain,
} from "wagmi";
import { Wallet, LogOut, ChevronDown, Copy, ExternalLink, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { monadTestnet } from "@/lib/wagmi";
import { formatEther } from "viem";

export function ConnectWalletButton() {
  const [open, setOpen] = useState(false);
  const { address, isConnected, isConnecting } = useAccount();
  const { connect, connectors, error, isPending } = useConnect();
  const { disconnect } = useDisconnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  
  const { data: balance } = useBalance({
    address,
  });

  const isWrongNetwork = isConnected && chainId !== monadTestnet.id;

  // Format address for display
  const formatAddress = (addr: string) => {
    return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
  };

  // Copy address to clipboard
  const copyAddress = () => {
    if (address) {
      navigator.clipboard.writeText(address);
    }
  };

  // Open block explorer
  const openExplorer = () => {
    if (address) {
      window.open(`${monadTestnet.blockExplorers.default.url}/address/${address}`, "_blank");
    }
  };

  // Handle wrong network
  if (isWrongNetwork) {
    return (
      <Button
        variant="destructive"
        className="gap-2"
        onClick={() => switchChain?.({ chainId: monadTestnet.id })}
      >
        <AlertCircle className="w-4 h-4" />
        Switch to Monad
      </Button>
    );
  }

  // Connected state
  if (isConnected && address) {
    return (
      <Dialog>
        <DialogTrigger asChild>
          <Button
            variant="outline"
            className="gap-2 border-primary/50 hover:border-primary hover:bg-primary/10"
          >
            <div className="w-2 h-2 rounded-full bg-green-500" />
            <span className="font-mono">{formatAddress(address)}</span>
            {balance && (
              <Badge variant="secondary" className="ml-1">
                {parseFloat(formatEther(balance.value)).toFixed(2)} MON
              </Badge>
            )}
            <ChevronDown className="w-4 h-4" />
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Connected Wallet</DialogTitle>
            <DialogDescription>
              Connected to Monad Testnet
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {/* Address */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Address</div>
              <div className="font-mono text-sm break-all">{address}</div>
            </div>

            {/* Balance */}
            <div className="p-4 rounded-lg bg-muted/50 border border-border/50">
              <div className="text-xs text-muted-foreground mb-1">Balance</div>
              <div className="text-2xl font-bold">
                {balance ? parseFloat(formatEther(balance.value)).toFixed(4) : "0"} MON
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2">
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={copyAddress}
              >
                <Copy className="w-4 h-4" />
                Copy
              </Button>
              <Button
                variant="outline"
                className="flex-1 gap-2"
                onClick={openExplorer}
              >
                <ExternalLink className="w-4 h-4" />
                Explorer
              </Button>
            </div>

            {/* Disconnect */}
            <Button
              variant="destructive"
              className="w-full gap-2"
              onClick={() => disconnect()}
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  // Not connected - show connect dialog
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          className="gap-2 border-primary/50 hover:border-primary hover:bg-primary/10"
          disabled={isConnecting}
        >
          <Wallet className="w-4 h-4" />
          {isConnecting ? "Connecting..." : "Connect Wallet"}
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Connect Wallet</DialogTitle>
          <DialogDescription>
            Connect your wallet to interact with Stratmos on Monad
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {connectors.map((connector) => (
            <Button
              key={connector.uid}
              variant="outline"
              className="w-full justify-start gap-3 h-14"
              onClick={() => {
                connect({ connector });
                setOpen(false);
              }}
              disabled={isPending}
            >
              <div className="w-8 h-8 rounded-lg bg-muted flex items-center justify-center">
                {connector.name === "WalletConnect" ? (
                  <span className="text-lg">🔗</span>
                ) : (
                  <Wallet className="w-4 h-4" />
                )}
              </div>
              <div className="text-left">
                <div className="font-medium">{connector.name}</div>
                <div className="text-xs text-muted-foreground">
                  {connector.name === "WalletConnect"
                    ? "Scan with mobile wallet"
                    : "Browser extension"}
                </div>
              </div>
            </Button>
          ))}

          {error && (
            <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-sm text-destructive">
              {error.message}
            </div>
          )}

          {/* Network info */}
          <div className="pt-4 border-t border-border/50">
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <div className="w-2 h-2 rounded-full bg-green-500" />
              Connecting to Monad Testnet
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
