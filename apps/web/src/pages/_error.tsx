import type { NextPageContext } from 'next';

interface ErrorProps {
  statusCode?: number;
}

function ErrorPage({ statusCode }: ErrorProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexDirection: 'column',
        gap: '12px',
        background: '#f9f6f1',
        color: '#3a3127',
      }}
    >
      <h1 style={{ margin: 0, fontSize: '32px' }}>{statusCode || 500}</h1>
      <p style={{ margin: 0 }}>页面暂时不可用，请稍后重试。</p>
    </div>
  );
}

ErrorPage.getInitialProps = ({ res, err }: NextPageContext) => {
  const statusCode = res ? res.statusCode : err ? err.statusCode : 404;
  return { statusCode };
};

export default ErrorPage;
