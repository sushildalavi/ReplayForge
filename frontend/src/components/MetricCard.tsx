interface MetricCardProps {
  title: string;
  value: string | number;
  sub?: string;
  color?: "default" | "green" | "red" | "yellow" | "blue";
}

const colorMap = {
  default: "border-gray-700",
  green: "border-green-600",
  red: "border-red-600",
  yellow: "border-yellow-600",
  blue: "border-blue-600",
};

export function MetricCard({ title, value, sub, color = "default" }: MetricCardProps) {
  return (
    <div className={`bg-gray-800 rounded-lg p-5 border-l-4 ${colorMap[color]}`}>
      <p className="text-xs text-gray-400 uppercase tracking-wide">{title}</p>
      <p className="text-3xl font-bold mt-1 text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-1">{sub}</p>}
    </div>
  );
}
