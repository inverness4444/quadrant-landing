export default function AnalyticsScripts() {
  const provider = process.env.ANALYTICS_PROVIDER;
  const id = process.env.ANALYTICS_ID;

  if (!provider || !id || provider === "none") {
    return null;
  }

  if (provider === "ga") {
    return (
      <>
        <script async src={`https://www.googletagmanager.com/gtag/js?id=${id}`} />
        <script
          dangerouslySetInnerHTML={{
            __html: `
window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');
`,
          }}
        />
      </>
    );
  }

  if (provider === "plausible") {
    return (
      <script
        async
        defer
        data-domain={id}
        src="https://plausible.io/js/plausible.js"
      />
    );
  }

  return null;
}
