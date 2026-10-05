import { InfoSectionCard, InfoStatBox } from "@/components/member/InfoSectionCard";
import { formatNumber } from "@/lib/format";

interface LatexOverviewSectionProps {
  rawWeightKg: number;
  dryWeightKg: number;
  saleCount: number;
}

export function LatexOverviewSection({
  rawWeightKg,
  dryWeightKg,
  saleCount,
}: LatexOverviewSectionProps) {
  return (
    <InfoSectionCard title="เกี่ยวกับน้ำยาง">
      <InfoStatBox
        label="น้ำหนักน้ำยางสดรวม (กิโลกรัม)"
        value={formatNumber(rawWeightKg)}
      />
      <InfoStatBox
        label="ปริมาณน้ำยางแห้งรวม"
        value={`${formatNumber(dryWeightKg)} กก.`}
      />
      <InfoStatBox
        label="ขายน้ำยางสดทั้งหมด"
        value={`${formatNumber(saleCount, 0)} ครั้ง`}
      />
    </InfoSectionCard>
  );
}
