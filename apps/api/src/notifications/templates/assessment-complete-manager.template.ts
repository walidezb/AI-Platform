export const assessmentCompleteManagerTemplate = (data: {
  managerName: string;
  employeeName: string;
  employeeRole: string;
  experienceLevel: string;
  strongAreas: string[];
  weakAreas: string[];
  orgName: string;
  dashboardUrl: string;
}) => ({
  subject: `📊 ${data.employeeName} completed their AI assessment`,
  html: `
<!DOCTYPE html>
<html>
<body style="margin:0;padding:0;background:#090912;
             font-family:-apple-system,BlinkMacSystemFont,sans-serif;">
  <div style="max-width:560px;margin:0 auto;padding:32px 16px;">

    <div style="background:#0f1220;border:1px solid #1e2438;
                border-radius:16px;padding:32px;">

      <h1 style="color:#fff;font-size:22px;font-weight:700;margin:0 0 8px 0;">
        Assessment Complete 📊
      </h1>
      <p style="color:#9ca3af;font-size:15px;margin:0 0 24px 0;">
        Hi ${data.managerName}, ${data.employeeName} has
        completed their AI skills assessment.
      </p>

      <!-- Employee card -->
      <div style="background:#161929;border:1px solid #1e2438;
                  border-radius:12px;padding:20px;margin-bottom:24px;">
        <div style="color:#e5e7eb;font-weight:600;font-size:16px;
                    margin-bottom:4px;">${data.employeeName}</div>
        <div style="color:#6b7280;font-size:14px;margin-bottom:16px;">
          ${data.employeeRole}
        </div>

        <!-- Level badge -->
        <div style="display:inline-block;background:#4f46e510;
                    border:1px solid #4f46e530;border-radius:20px;
                    padding:4px 12px;color:#818cf8;font-size:13px;
                    font-weight:600;margin-bottom:16px;">
          ${data.experienceLevel}
        </div>

        <!-- Strengths -->
        <div style="margin-bottom:12px;">
          <div style="color:#6b7280;font-size:12px;margin-bottom:6px;">
            STRENGTHS
          </div>
          <div>
            ${data.strongAreas.map(s =>
              `<span style="display:inline-block;background:#10b98110;
                           border:1px solid #10b98130;border-radius:12px;
                           padding:3px 10px;color:#34d399;font-size:12px;
                           margin:2px;">${s}</span>`
            ).join('')}
          </div>
        </div>

        <!-- Growth areas -->
        <div>
          <div style="color:#6b7280;font-size:12px;margin-bottom:6px;">
            GROWTH AREAS
          </div>
          <div>
            ${data.weakAreas.map(w =>
              `<span style="display:inline-block;background:#f59e0b10;
                           border:1px solid #f59e0b30;border-radius:12px;
                           padding:3px 10px;color:#fbbf24;font-size:12px;
                           margin:2px;">${w}</span>`
            ).join('')}
          </div>
        </div>
      </div>

      <div style="text-align:center;">
        <a href="${data.dashboardUrl}"
           style="display:inline-block;background:linear-gradient(135deg,#6366f1,#8b5cf6);
                  color:#fff;text-decoration:none;font-size:15px;font-weight:600;
                  padding:12px 28px;border-radius:10px;">
          View Team Dashboard →
        </a>
      </div>
    </div>

    <div style="text-align:center;color:#4b5563;font-size:12px;
                margin-top:24px;">
      LearnPath AI · ${data.orgName}
    </div>
  </div>
</body>
</html>
  `,
});
