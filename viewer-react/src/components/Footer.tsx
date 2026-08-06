export default function Footer() {
  return (
    <footer className="h-10 bg-brand-navy text-white flex items-center justify-center border-t border-brand-blue-light/20">
      <p className="text-xs">
        本システムについては、必ず
        <a href="#" className="underline hover:no-underline ml-1">
          免責条項
        </a>
        をご確認ください
      </p>
    </footer>
  );
}
