import { useState } from 'react';
import { Link2, Copy, Check, RefreshCw, Loader2 } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/shared/ui/dialog';

// Shows the group's shareable join link and lets the creator rotate it. The
// token comes from the API; the full URL is assembled here from the current
// origin so it works across environments without the server knowing the host.
const InviteLinkDialog = ({
  open,
  onClose,
  groupId,
  token,
  isGroupCreator,
  isRotating,
  onRotate,
}) => {
  const [copied, setCopied] = useState(false);

  const inviteUrl = token
    ? `${window.location.origin}/groups/${groupId}/join?token=${encodeURIComponent(token)}`
    : '';

  const handleCopy = async () => {
    if (!inviteUrl) return;
    try {
      await navigator.clipboard.writeText(inviteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard API unavailable (e.g. insecure context) — the input is
      // selectable so the user can copy manually.
    }
  };

  return (
    <Dialog open={open} onOpenChange={(next) => { if (!next) onClose(); }}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Link2 className="w-5 h-5 text-indigo-400" />
            Invite link
          </DialogTitle>
          <DialogDescription>
            Anyone with this link can join the group — no username needed.
          </DialogDescription>
        </DialogHeader>

        <div className="flex gap-2">
          <Input
            readOnly
            value={inviteUrl}
            onFocus={(e) => e.target.select()}
            placeholder="Generating link..."
            className="font-mono text-xs"
          />
          <Button onClick={handleCopy} disabled={!inviteUrl} className="shrink-0">
            {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied' : 'Copy'}
          </Button>
        </div>

        {isGroupCreator && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-white/[0.06] bg-white/[0.02] p-3">
            <p className="text-sm text-muted-foreground">
              Rotating the link disables the current one.
            </p>
            <Button variant="outline" size="sm" onClick={onRotate} disabled={isRotating} className="shrink-0">
              {isRotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Rotate
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default InviteLinkDialog;
