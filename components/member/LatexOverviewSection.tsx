"use client";

import { InfoSectionCard, InfoStatBox } from "@/components/member/InfoSectionCard";
import { useYearSelector } from "@/components/member/useYearSelector";
import { formatNumber } from "@/lib/format";
import type { MemberYearlySummary } from "@/lib/types";

interface LatexOverviewSectionProps {
  yearlySummaries: MemberYearlySummary[];
}

export function LatexOverviewSection({
  yearlySummaries,
}: LatexOverviewSectionProps) {
  const rawWeight = useYearSelector(yearlySummaries, "เลือกปีน้ำหนักน้ำยาง");
  const dryWeight = useYearSelector(yearlySummaries, "เลือกปีน้ำยางแห้ง");

  return (
    <InfoSectionCard title="เกี่ยวกับน้ำยาง">
      <InfoStatBox
        label="น้ำหนักน้ำยางสดรวม (กิโลกรัม)"
        value={formatNumber(rawWeight.selected.rawWeightKg)}
        hint={`น้ำหนักน้ำยางที่ส่งขายรวมทั้งปี ${rawWeight.year}`}
        selector={rawWeight.selector}
      />
      <InfoStatBox
        label="ปริมาณน้ำยางแห้งรวม"
        value={formatNumber(dryWeight.selected.dryWeightKg)}
        hint={`น้ำหนักน้ำยางแห้งที่ส่งขายรวมทั้งปี ${dryWeight.year}`}
        selector={dryWeight.selector}
      />
      <InfoStatBox label="" />
    </InfoSectionCard>
  );
}
