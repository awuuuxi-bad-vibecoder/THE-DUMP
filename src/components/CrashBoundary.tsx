import React, { useEffect, useRef, useState } from 'react';
import { crashGuard, CrashReport } from '../game/crashGuard';
import { I18N, Lang } from '../game/i18n';

interface CrashOverlayProps {
  report: CrashReport;
  lang: Lang;
  hasRenderCrash: boolean;
  onContinue: () => void;
  onReset: () => void;
}

const CrashOverlay: React.FC<CrashOverlayProps> = ({
  report,
  lang,
  hasRenderCrash,
  onContinue,
  onReset,
}) => {
  const t = I18N[lang];
  const [copied, setCopied] = useState(false);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const fullText = crashGuard.formatReportText(report);

  const handleCopy = async () => {
    let ok = false;
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(fullText);
        ok = true;
      }
    } catch {
      ok = false;
    }
    if (!ok && textAreaRef.current) {
      try {
        textAreaRef.current.focus();
        textAreaRef.current.select();
        ok = document.execCommand('copy');
      } catch {
        ok = false;
      }
    }
    if (ok) {
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-[#050507]/92">
      <div className="w-full max-w-2xl bg-[#110e12] pixel-border-lit p-4 sm:p-6 flex flex-col max-h-[92vh]">
        <div className="flex items-start justify-between gap-3 mb-2">
          <div>
            <h2 className="font-pixel-title text-xs sm:text-sm text-[#ff5a5f]">
              {t.crashTitle}
            </h2>
            <p className="text-xs text-[#b8afa0] mt-1 leading-snug">
              {t.crashSubtitle}
            </p>
          </div>
          <span className="text-[11px] text-[#787066] shrink-0 font-mono">
            {report.source}
          </span>
        </div>

        <div className="bg-[#1b1216] border border-[#592329] px-3 py-2 text-xs text-[#ffb3b6] font-mono mb-3 break-words">
          {report.message}
        </div>

        <textarea
          ref={textAreaRef}
          readOnly
          value={fullText}
          onClick={(e) => e.currentTarget.select()}
          className="w-full flex-1 min-h-[180px] sm:min-h-[220px] bg-[#08080b] text-[#cfd6de] border border-[#2d2933] p-2.5 text-[11px] font-mono leading-relaxed resize-none focus:outline-none select-text"
        />

        <div className="mt-4 flex flex-wrap items-center justify-end gap-2.5">
          <button
            onClick={handleCopy}
            className="px-4 py-2 bg-[#2a2115] text-[#ffd584] pixel-border-lit text-xs sm:text-sm font-bold cursor-pointer"
          >
            {copied ? t.crashCopied : t.crashCopy}
          </button>

          {!hasRenderCrash && (
            <button
              onClick={onContinue}
              className="px-4 py-2 bg-[#18261c] text-[#8ef5a2] pixel-border text-xs sm:text-sm font-bold cursor-pointer"
            >
              {t.crashContinue}
            </button>
          )}

          <button
            onClick={onReset}
            className="px-4 py-2 bg-[#2d1418] text-[#ff8e93] pixel-border text-xs sm:text-sm font-bold cursor-pointer"
          >
            {t.crashReset}
          </button>
        </div>
      </div>
    </div>
  );
};

interface CrashBoundaryProps {
  children: React.ReactNode;
}

interface CrashBoundaryState {
  renderCrashed: boolean;
}

class ReactErrorBoundary extends React.Component<
  { onCaught: (err: Error) => void; renderCrashed: boolean; children: React.ReactNode },
  CrashBoundaryState
> {
  constructor(props: { onCaught: (err: Error) => void; renderCrashed: boolean; children: React.ReactNode }) {
    super(props);
    this.state = { renderCrashed: false };
  }

  static getDerivedStateFromError(): CrashBoundaryState {
    return { renderCrashed: true };
  }

  componentDidCatch(error: Error) {
    crashGuard.reportError('React.ErrorBoundary', error);
    this.props.onCaught(error);
  }

  render() {
    if (this.state.renderCrashed || this.props.renderCrashed) {
      return null;
    }
    return this.props.children;
  }
}

export const CrashBoundary: React.FC<CrashBoundaryProps> = ({ children }) => {
  const [report, setReport] = useState<CrashReport | null>(null);
  const [renderCrashed, setRenderCrashed] = useState(false);

  useEffect(() => {
    crashGuard.init();
    return crashGuard.subscribe((r) => setReport(r));
  }, []);

  const lang: Lang =
    typeof document !== 'undefined' && document.documentElement.lang === 'ru' ? 'ru' : 'en';

  return (
    <>
      <ReactErrorBoundary
        renderCrashed={renderCrashed}
        onCaught={() => setRenderCrashed(true)}
      >
        {children}
      </ReactErrorBoundary>

      {report && (
        <CrashOverlay
          report={report}
          lang={lang}
          hasRenderCrash={renderCrashed}
          onContinue={() => {
            crashGuard.clearCrash();
          }}
          onReset={() => {
            crashGuard.clearCrash();
            window.location.reload();
          }}
        />
      )}
    </>
  );
};
