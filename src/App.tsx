import { StrictMode, Suspense } from "react";
import Frame from "./components/layout/Frame";
import Routes from "./routes";
import { ErrorBoundary } from "react-error-boundary";
import { ErrorFallback } from "./components/common/ErrorFallback";
import usePageTracking from "./modules/common/usePageTracking";
import { useCookieTokenFallback } from "./modules/client";
import { unregister } from "./serviceWorkerRegistration";
import { LoadingFullScreen } from "./components/common/GlobalLoadingStatus";
import { useTranslation } from "react-i18next";

function App(this: any) {
  // Page tracker suggested via https://stackoverflow.com/a/63249329
  usePageTracking();
  useCookieTokenFallback();

  const { ready: translationReady } = useTranslation();

  return (
    // Last resort error boundary
    <ErrorBoundary
      FallbackComponent={ErrorFallback}
      onReset={() => {
        window.location.reload();
        // Reset the state here
      }}
    >
      {translationReady ? (
        <Frame>
          {/* TODO: ADD REAL LOADING PAGE */}
          <StrictMode>
            <Suspense fallback={<LoadingFullScreen />}>
              <ErrorBoundary
                FallbackComponent={ErrorFallback}
                onReset={() => {
                  unregister();
                  window.location.reload();
                  // Reset the state here
                }}
              >
                <Routes />
              </ErrorBoundary>
            </Suspense>
          </StrictMode>
        </Frame>
      ) : (
        <LoadingFullScreen />
      )}
    </ErrorBoundary>
  );
}

export default App;
