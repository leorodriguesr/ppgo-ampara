type ComingSoonProps = {
  title: string;
  description: string;
};

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <div className="max-w-xl">
      <h1 className="text-lg font-semibold text-[#1B2A41]">{title}</h1>
      <p className="mt-2 text-sm leading-6 text-[#4B5563]">{description}</p>
    </div>
  );
}
