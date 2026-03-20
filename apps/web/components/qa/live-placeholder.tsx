interface LivePlaceholderProps {
  status: "reviewing" | "dismissed";
}

export function LivePlaceholder({ status }: LivePlaceholderProps) {
  if (status === "dismissed") {
    return (
      <div className="bg-muted rounded-lg p-4">
        <p className="text-sm text-muted-foreground">
          This question was not addressed in this session.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-muted rounded-lg p-4">
      <p className="text-sm text-muted-foreground">
        <span className="animate-pulse bg-amber-400 rounded-full h-2 w-2 inline-block mr-2" />
        Your question is being reviewed by the presenter -- you will be notified
        when answered.
      </p>
    </div>
  );
}
