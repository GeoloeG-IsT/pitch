import { Badge } from "@/components/ui/badge"
import { ShieldCheck } from "lucide-react"

export function VerifiedBadge() {
  return (
    <Badge className="bg-[hsl(142,71%,45%)] text-white hover:bg-[hsl(142,71%,40%)] gap-1">
      <ShieldCheck className="h-3.5 w-3.5" />
      Verified
    </Badge>
  )
}
