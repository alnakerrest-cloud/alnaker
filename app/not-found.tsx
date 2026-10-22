import Link from 'next/link';
import './globals.css';

export default function NotFound() {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <main className="qr-page">
          <section className="qr-card">
            <h1>404</h1>
            <p className="qr-title">الصفحة غير موجودة</p>
            <p className="qr-sub">Page not found</p>
            <div className="qr-actions">
              <Link className="btn solid" href="/ar">
                العودة للمنيو
              </Link>
              <Link className="btn outline" href="/en">
                Back to the menu
              </Link>
            </div>
          </section>
        </main>
      </body>
    </html>
  );
}
