/**
 * scoringService.js
 *
 * Implements a real (if simplified) scoring model for a CNC turning attempt,
 * replacing the hardcoded 68/94 demo values from the front-end prototype.
 *
 * NOTE: The formulas below (surface-finish estimate, dimensional simulation,
 * ideal parameter ranges) are reasonable engineering approximations for a
 * demonstration engine. A production system should have these ranges and
 * weights reviewed and validated by qualified manufacturing/process engineers,
 * as the original project documentation itself recommends.
 */

const TOOLS = {
  'CNMG Roughing Insert': {
    kind: 'ROUGHING',
    noseRadiusMm: 0.8,
    idealRpm: [800, 1500],
    idealFeed: [0.2, 0.4],
    idealDepth: [1.0, 3.0],
  },
  'VNMG Finishing Insert': {
    kind: 'FINISHING',
    noseRadiusMm: 0.4,
    idealRpm: [1200, 2500],
    idealFeed: [0.05, 0.15],
    idealDepth: [0.1, 0.5],
  },
};

const CORRECT_SEQUENCE = ['Workpiece Setup', 'Rough Turning', 'Finish Turning', 'Measurement'];

const WEIGHTS = {
  toolSelection: 15,
  spindleSpeed: 10,
  feedRate: 15,
  depthOfCut: 10,
  processSequence: 15,
  dimensionalAccuracy: 20,
  surfaceFinish: 15,
};

const READY_THRESHOLD = 85;

function scoreInRange(value, [min, max], weight) {
  if (value >= min && value <= max) return weight;
  const span = max - min || 1;
  const distance = value < min ? min - value : value - max;
  const penalty = Math.min(1, distance / span);
  return Math.max(0, weight * (1 - penalty));
}

function simulateFinalDimension({ startDimensionMm, depthOfCutMm, processSequence }) {
  const hasTurningStep = processSequence.some(
    (step) => step === 'Rough Turning' || step === 'Finish Turning'
  );
  if (!hasTurningStep) return startDimensionMm;
  // Simplified single-pass model: this prototype exposes one depth-of-cut control for the
  // whole cycle (matching the front-end's parameter panel), so net radial stock removal is
  // 2x the configured depth regardless of how many turning steps were selected. A production
  // assessment engine would track a separate depth per operation (rough vs. finish pass).
  return Number((startDimensionMm - 2 * depthOfCutMm).toFixed(3));
}

function estimateSurfaceFinishRa({ feedRateMmRev, noseRadiusMm }) {
  // Standard turning surface-roughness approximation: Ra ≈ f^2 / (32 * r), in microns when f, r in mm
  const ra = (feedRateMmRev ** 2 * 1000) / (32 * noseRadiusMm);
  return Number(ra.toFixed(2));
}

function scoreProcessSequence(processSequence) {
  const requiredSteps = new Set(CORRECT_SEQUENCE);
  const submittedSteps = processSequence.filter((s) => requiredSteps.has(s));
  const uniqueSteps = new Set(submittedSteps);

  const completenessRatio = uniqueSteps.size / CORRECT_SEQUENCE.length;

  // Check ordering: does the submitted sequence (filtered to known steps) match the correct relative order?
  let orderCorrect = true;
  let lastIndex = -1;
  for (const step of submittedSteps) {
    const idx = CORRECT_SEQUENCE.indexOf(step);
    if (idx < lastIndex) {
      orderCorrect = false;
      break;
    }
    lastIndex = idx;
  }

  const orderRatio = orderCorrect ? 1 : 0.5;
  return WEIGHTS.processSequence * completenessRatio * orderRatio;
}

/**
 * @param {object} task - row from tasks table
 * @param {object} attempt - { tool, spindleSpeedRpm, feedRateMmRev, depthOfCutMm, processSequence }
 * @returns {object} { score, status, breakdown, gaps, simulated }
 */
function evaluateAttempt(task, attempt) {
  const toolProfile = TOOLS[attempt.tool];
  if (!toolProfile) {
    throw new Error(`Unknown tool: ${attempt.tool}`);
  }

  const simulatedFinalDimensionMm = simulateFinalDimension({
    startDimensionMm: Number(task.start_dimension_mm),
    depthOfCutMm: attempt.depthOfCutMm,
    processSequence: attempt.processSequence,
  });

  const simulatedSurfaceFinishRa = estimateSurfaceFinishRa({
    feedRateMmRev: attempt.feedRateMmRev,
    noseRadiusMm: toolProfile.noseRadiusMm,
  });

  // Expected tool: heavy depth of cut implies roughing should be happening with the CNMG insert;
  // light depth + fine feed implies a finishing pass, which should use the VNMG insert.
  const expectedKind = attempt.depthOfCutMm > 0.5 ? 'ROUGHING' : 'FINISHING';
  const toolSelectionScore = toolProfile.kind === expectedKind ? WEIGHTS.toolSelection : WEIGHTS.toolSelection * 0.3;

  const spindleSpeedScore = scoreInRange(attempt.spindleSpeedRpm, toolProfile.idealRpm, WEIGHTS.spindleSpeed);
  const feedRateScore = scoreInRange(attempt.feedRateMmRev, toolProfile.idealFeed, WEIGHTS.feedRate);
  const depthOfCutScore = scoreInRange(attempt.depthOfCutMm, toolProfile.idealDepth, WEIGHTS.depthOfCut);
  const processSequenceScore = scoreProcessSequence(attempt.processSequence);

  const dimensionError = Math.abs(simulatedFinalDimensionMm - Number(task.target_dimension_mm));
  const dimensionalAccuracyScore = dimensionError <= Number(task.tolerance_mm)
    ? WEIGHTS.dimensionalAccuracy
    : Math.max(0, WEIGHTS.dimensionalAccuracy * (1 - dimensionError / (Number(task.tolerance_mm) * 4)));

  const surfaceFinishError = Math.abs(simulatedSurfaceFinishRa - Number(task.target_surface_finish_ra));
  const surfaceFinishScore = surfaceFinishError <= 0.2
    ? WEIGHTS.surfaceFinish
    : Math.max(0, WEIGHTS.surfaceFinish * (1 - surfaceFinishError / (Number(task.target_surface_finish_ra) * 1.5)));

  const breakdown = {
    toolSelection: round(toolSelectionScore),
    spindleSpeed: round(spindleSpeedScore),
    feedRate: round(feedRateScore),
    depthOfCut: round(depthOfCutScore),
    processSequence: round(processSequenceScore),
    dimensionalAccuracy: round(dimensionalAccuracyScore),
    surfaceFinish: round(surfaceFinishScore),
  };

  const score = round(Object.values(breakdown).reduce((sum, v) => sum + v, 0));
  const status = score >= READY_THRESHOLD ? 'READY_FOR_ROLE' : 'GAPS_IDENTIFIED';

  const gaps = [];
  if (breakdown.toolSelection < WEIGHTS.toolSelection * 0.7) {
    gaps.push({ gapName: 'Tool Selection Knowledge', description: 'Selected tool did not match the required operation (roughing vs. finishing).' });
  }
  if (breakdown.spindleSpeed < WEIGHTS.spindleSpeed * 0.7 || breakdown.feedRate < WEIGHTS.feedRate * 0.7 || breakdown.depthOfCut < WEIGHTS.depthOfCut * 0.7) {
    gaps.push({ gapName: 'Cutting Parameter Selection', description: 'Spindle speed, feed rate, or depth of cut fell outside the recommended range for the selected tool.' });
  }
  if (breakdown.processSequence < WEIGHTS.processSequence * 0.7) {
    gaps.push({ gapName: 'Process Planning', description: 'Machining operations were incomplete or performed out of order.' });
  }
  if (breakdown.dimensionalAccuracy < WEIGHTS.dimensionalAccuracy * 0.7) {
    gaps.push({ gapName: 'GD&T Knowledge', description: `Final dimension (${simulatedFinalDimensionMm}mm) fell outside the target tolerance band.` });
  }
  if (breakdown.surfaceFinish < WEIGHTS.surfaceFinish * 0.7) {
    gaps.push({ gapName: 'Finishing Feed Rate Tolerance', description: `Estimated surface finish (Ra ${simulatedSurfaceFinishRa}μm) did not meet the ${task.target_surface_finish_ra}μm target.` });
  }

  // Verification areas shown on the employer's practical-skill audit
  const verificationAreas = {
    'Tool Selection': breakdown.toolSelection >= WEIGHTS.toolSelection * 0.8,
    'Process Sequence': breakdown.processSequence >= WEIGHTS.processSequence * 0.8,
    'GD&T & Finishing': (breakdown.dimensionalAccuracy + breakdown.surfaceFinish) >=
      (WEIGHTS.dimensionalAccuracy + WEIGHTS.surfaceFinish) * 0.8,
  };

  return {
    score,
    status,
    breakdown,
    gaps,
    verificationAreas,
    simulated: {
      finalDimensionMm: simulatedFinalDimensionMm,
      surfaceFinishRa: simulatedSurfaceFinishRa,
    },
  };
}

function round(n) {
  return Math.round(n * 100) / 100;
}

module.exports = { evaluateAttempt, TOOLS, CORRECT_SEQUENCE, READY_THRESHOLD };
