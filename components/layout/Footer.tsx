import Link from "next/link";

const footerLinks = {
  "Khoá học": [
    { href: "/courses", label: "Tất cả khoá học" },
    { href: "/pricing", label: "Bảng giá" },
    { href: "/mentors", label: "Mentor" },
  ],
  "Hỗ trợ": [
    { href: "#", label: "Câu hỏi thường gặp" },
    { href: "#", label: "Liên hệ" },
    { href: "#", label: "Discord Community" },
  ],
  "Pháp lý": [
    { href: "#", label: "Điều khoản sử dụng" },
    { href: "#", label: "Chính sách bảo mật" },
    { href: "#", label: "Chính sách hoàn tiền" },
  ],
};

export function Footer() {
  return (
    <footer className="border-t border-gold-shadow/30 bg-gold-black">
      <div className="mx-auto max-w-7xl px-4 lg:px-8 py-16">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link href="/" className="text-2xl font-bold gold-gradient-text">
              ROVA
            </Link>
            <p className="mt-4 text-sm text-muted-foreground leading-relaxed">
              Nền tảng học Trading chuyên nghiệp. Từ zero đến profitable cùng
              mentor hàng đầu.
            </p>
          </div>

          {/* Link columns */}
          {Object.entries(footerLinks).map(([title, links]) => (
            <div key={title}>
              <h3 className="text-sm font-semibold text-gold mb-4">{title}</h3>
              <ul className="space-y-3">
                {links.map((link) => (
                  <li key={link.label}>
                    <Link
                      href={link.href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-8 border-t border-gold-shadow/30 flex flex-col sm:flex-row justify-between items-center gap-4">
          <p className="text-sm text-muted-foreground">
            &copy; {new Date().getFullYear()} ROVA. All rights reserved.
          </p>
          <p className="text-sm text-muted-foreground">
            Made with dedication for Vietnamese traders
          </p>
        </div>
      </div>
    </footer>
  );
}
