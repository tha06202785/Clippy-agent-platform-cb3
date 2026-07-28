export default function Head() {
  return (
    <>
      <style>{`
        @media (max-width: 767px) {
          nav.fixed.top-0.left-0.right-0 > div.max-w-7xl {
            padding-left: 1rem;
            padding-right: 1rem;
            padding-top: 0.75rem;
            padding-bottom: 0.75rem;
          }

          nav.fixed.top-0.left-0.right-0 > div.max-w-7xl > div.hidden.md\\:flex {
            display: flex !important;
            align-items: center;
            gap: 0.5rem;
          }

          nav.fixed.top-0.left-0.right-0 a[href="#features"],
          nav.fixed.top-0.left-0.right-0 a[href="#how-it-works"],
          nav.fixed.top-0.left-0.right-0 a[href="#pricing"] {
            display: none !important;
          }

          nav.fixed.top-0.left-0.right-0 a[href="/sign-in"] {
            display: inline-flex !important;
            min-height: 44px;
            align-items: center;
            justify-content: center;
            border: 1px solid rgb(212 212 212);
            border-radius: 0.75rem;
            padding: 0.6rem 0.9rem;
            background: white;
            color: rgb(38 38 38);
            font-weight: 700;
            white-space: nowrap;
          }

          nav.fixed.top-0.left-0.right-0 a[href="/signup"] {
            display: none !important;
          }

          section.relative.pt-32 {
            padding-top: 7.5rem;
            padding-left: 1rem;
            padding-right: 1rem;
          }

          section.relative.pt-32 h1 {
            font-size: clamp(2.7rem, 13vw, 4rem) !important;
            line-height: 1.04 !important;
            margin-bottom: 1.5rem !important;
          }

          section.relative.pt-32 p {
            font-size: 1.05rem !important;
            line-height: 1.6 !important;
            margin-bottom: 2rem !important;
          }

          section.relative.pt-32 .inline-flex.items-center.gap-2 {
            margin-bottom: 1.5rem !important;
          }

          section.relative.pt-32 a[href="/signup"] {
            width: 100%;
            max-width: 22rem;
            justify-content: center;
          }
        }
      `}</style>
    </>
  );
}
