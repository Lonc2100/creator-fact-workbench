import type { MonetizationLead } from "../../types";
import { formatNumber } from "../foundations/format";
import { Panel } from "../primitives/Panel";

const stages: Array<{ id: MonetizationLead["status"]; label: string }> = [
  { id: "new", label: "新线索" },
  { id: "follow_up", label: "待跟进" },
  { id: "contacted", label: "已沟通" },
  { id: "proposal", label: "方案中" },
  { id: "won", label: "成交" },
  { id: "lost", label: "丢失" }
];

export function LeadPipeline({ leads }: { leads: MonetizationLead[] }) {
  return (
    <Panel title="线索跟进" eyebrow="Simple CRM">
      <div className="lead-pipeline">
        {stages.map((stage) => {
          const rows = leads.filter((lead) => lead.status === stage.id);
          return (
            <section className="lead-stage" key={stage.id}>
              <header><strong>{stage.label}</strong><span>{rows.length}</span></header>
              {rows.slice(0, 4).map((lead) => (
                <article className="lead-card" key={lead.id}>
                  <strong>{lead.source}</strong>
                  <p>{lead.demand ?? lead.nextAction}</p>
                  <small>¥{formatNumber(lead.valueEstimate)}</small>
                </article>
              ))}
            </section>
          );
        })}
      </div>
    </Panel>
  );
}
