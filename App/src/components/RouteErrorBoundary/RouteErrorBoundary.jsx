import { useRouteError } from "react-router";
import { ErrorState } from "../ApiState/ApiState";

export default function RouteErrorBoundary() {
  const error = useRouteError();
  return <ErrorState error={error} minHeight="100vh" onRetry={() => window.location.reload()} />;
}
