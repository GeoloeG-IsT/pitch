export function VerificationPlaceholder() {
  return (
    <div className="bg-muted rounded-lg p-4">
      <p className="text-sm text-muted-foreground">
        <span className="animate-pulse bg-amber-400 rounded-full h-2 w-2 inline-block mr-2" />
        This answer is being verified by the team -- check back shortly.
      </p>
    </div>
  )
}
