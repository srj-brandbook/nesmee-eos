function sumWeights(factors = []) {
  return factors.reduce((total, factor) => total + Number(factor.weight || 0), 0);
}

function validateProfile(profile) {
  const factors = profile?.factors || [];
  if (!factors.length) {
    return { ok: false, message: "Score profile must include at least one factor" };
  }
  const total = sumWeights(factors);
  if (Math.abs(total - 100) > 0.01) {
    return { ok: false, message: `Factor weights must sum to 100 (currently ${total})` };
  }
  return { ok: true, total };
}

function clamp(value, min = 0, max = 100) {
  const number = Number(value);
  if (Number.isNaN(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function invertIfRisk(key, value) {
  if (key === "country_risk" || key === "risk" || key === "competition") {
    return 100 - clamp(value);
  }
  return clamp(value);
}

function scoreFromBreakdown(profile, breakdown = {}) {
  const factors = profile?.factors || [];
  const validation = validateProfile({ factors });
  if (!validation.ok) {
    return { score: 0, label: "", breakdown: {}, error: validation.message };
  }

  let total = 0;
  const detail = {};
  factors.forEach((factor) => {
    const raw = breakdown[factor.key];
    const value = raw == null ? 50 : invertIfRisk(factor.key, raw);
    const contribution = (value * Number(factor.weight)) / 100;
    detail[factor.key] = {
      label: factor.label,
      weight: factor.weight,
      input: raw == null ? 50 : clamp(raw, factor.min, factor.max),
      value,
      contribution,
    };
    total += contribution;
  });

  const score = Math.round(clamp(total) * 100) / 100;
  const label = labelForScore(profile?.thresholds, score);
  return { score, label, breakdown: detail };
}

function labelForScore(thresholds = [], score = 0) {
  const match = (thresholds || []).find((item) => score >= item.min && score <= item.max);
  return match?.label || "";
}

module.exports = { sumWeights, validateProfile, clamp, scoreFromBreakdown, labelForScore, invertIfRisk };
