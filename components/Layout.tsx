import React from 'react';

interface LayoutProps {
  children: React.ReactNode;
  onStartNew?: () => void;
  onNavigateSection?: (sectionId: string) => void;
}

const Layout: React.FC<LayoutProps> = ({
  children,
  onStartNew,
  onNavigateSection,
}) => {
  const handleNavClick = (
    e: React.MouseEvent<HTMLAnchorElement>,
    sectionId: string
  ) => {
    if (onNavigateSection) {
      e.preventDefault();
      onNavigateSection(sectionId);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070B0E] text-[#F1F5F2]">
      <header className="print:hidden sticky top-0 z-50 bg-[#070B0E]/90 backdrop-blur-md border-b border-[#1E2E35]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
          <a
            href="#top"
            onClick={(e) => handleNavClick(e, 'top')}
            className="font-display text-2xl font-bold tracking-tight text-[#E5C158] hover:text-[#F3D77D] transition-colors whitespace-nowrap shrink-0"
          >
            الدكتور يوسف
          </a>

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#A3B3AC]">
            <a
              href="#top"
              onClick={(e) => handleNavClick(e, 'top')}
              className="hover:text-[#F1F5F2] transition-colors whitespace-nowrap shrink-0"
            >
              الرئيسية
            </a>
            <a
              href="#how-it-works"
              onClick={(e) => handleNavClick(e, 'how-it-works')}
              className="hover:text-[#F1F5F2] transition-colors whitespace-nowrap shrink-0"
            >
              آلية التحليل
            </a>
            <a
              href="#privacy"
              onClick={(e) => handleNavClick(e, 'privacy')}
              className="hover:text-[#F1F5F2] transition-colors whitespace-nowrap shrink-0"
            >
              الخصوصية
            </a>
          </nav>

          <div className="flex items-center shrink-0">
            <button
              type="button"
              onClick={onStartNew}
              className="px-4 py-2 text-xs sm:text-sm font-semibold rounded-lg bg-[#D4AF37] text-[#070B0E] hover:bg-[#E5C158] transition-colors cursor-pointer whitespace-nowrap shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E5C158]"
            >
              تحليل روشتة جديدة
            </button>
          </div>
        </div>
      </header>

      <main className="flex-1 w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 lg:py-12">
        {children}
      </main>

      <footer className="print:hidden border-t border-[#1E2E35] bg-[#090F13] py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-[#7D8F88]">
          <p>
            &copy; {new Date().getFullYear()} الدكتور يوسف — تحليل الروشتات الطبية بالذكاء الاصطناعي
          </p>
          <p>استخدام تقني استرشادي، استشر الطبيب أو الصيدلي قبل تناول أي دواء</p>
        </div>
      </footer>
    </div>
  );
};

export default Layout;
