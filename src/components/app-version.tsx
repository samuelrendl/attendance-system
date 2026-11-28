/**
 * The release this build is: APP_VERSION, which the release workflow sets to
 * the git tag when it builds the image (see Dockerfile). It's read during the
 * build, so it's baked into prerendered pages too. "dev" outside a release.
 */
export function AppVersion({ className }: { className?: string }) {
  return (
    <span className={className} data-testid="app-version">
      {process.env.APP_VERSION || "dev"}
    </span>
  );
}
