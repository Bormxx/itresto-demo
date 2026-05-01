import { ReactNode } from 'react';

export default function WaiterProfileLayout({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <>
      {children}
      {/* Inline script который выполнится гарантированно */}
      <script
        dangerouslySetInnerHTML={{
          __html: `
            if (window.ReactNativeWebView) {
              setTimeout(function() {
                window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'pageLoaded' }));
              }, 100);
            } else {
            }
          `,
        }}
      />
    </>
  );
}
