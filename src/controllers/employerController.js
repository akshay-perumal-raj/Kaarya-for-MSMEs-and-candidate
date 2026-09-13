const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const candidateModel = require('../models/candidateModel');
const assessmentModel = require('../models/assessmentModel');
const verificationModel = require('../models/verificationModel');
const shortlistModel = require('../models/shortlistModel');
const { logAction } = require('../services/auditService');

// GET /api/employer/candidates  - candidate pipeline
const getPipeline = asyncHandler(async (req, res) => {
  const candidates = await candidateModel.listAll();

  const pipeline = await Promise.all(
    candidates.map(async (c) => {
      const latest = await assessmentModel.latestByCandidate(c.id);
      return {
        candidateId: c.id,
        name: c.name,
        email: c.email,
        status: c.status,
        latestAssessment: latest
          ? { id: latest.id, taskCode: latest.task_code, score: latest.score, status: latest.status, type: latest.type }
          : null,
      };
    })
  );

  res.json({ pipeline });
});

// GET /api/employer/candidates/:id/report  - practical skill audit
const getCandidateReport = asyncHandler(async (req, res) => {
  const candidateId = Number(req.params.id);

  const candidate = await candidateModel.findById(candidateId);
  if (!candidate) throw new ApiError(404, 'Candidate not found');

  const assessments = await assessmentModel.listByCandidate(candidateId);
  const verification = await verificationModel.listByCandidate(candidateId);

  const initial = assessments.filter((a) => a.type === 'INITIAL').slice(-1)[0];
  const latest = assessments[0];

  const readyForRole = latest && latest.status === 'READY_FOR_ROLE';

  res.json({
    candidate,
    initialScore: initial ? initial.score : null,
    latestScore: latest ? latest.score : null,
    readyForRole,
    verification,
    assessments,
  });
});

// POST /api/employer/shortlist  { candidateId, roleId }
const shortlistCandidate = asyncHandler(async (req, res) => {
  if (req.user.role !== 'employer' || !req.user.employerId) {
    throw new ApiError(403, 'Only an employer account can shortlist candidates');
  }
  const { candidateId, roleId } = req.body;

  const latest = await assessmentModel.latestByCandidate(candidateId);
  if (!latest || latest.status !== 'READY_FOR_ROLE') {
    throw new ApiError(
      400,
      'Candidate requires further training. Cannot shortlist until status is READY_FOR_ROLE.'
    );
  }

  const shortlist = await shortlistModel.upsertShortlist({
    employerId: req.user.employerId,
    candidateId,
    roleId: roleId || null,
    status: 'SHORTLISTED',
  });

  await logAction(req, { action: 'SHORTLIST_CANDIDATE', entity: 'shortlists', entityId: shortlist.id });

  res.status(201).json({ shortlist });
});

// GET /api/employer/shortlist
const listShortlist = asyncHandler(async (req, res) => {
  if (req.user.role !== 'employer' || !req.user.employerId) {
    throw new ApiError(403, 'Only an employer account can view its shortlist');
  }
  const shortlist = await shortlistModel.listByEmployer(req.user.employerId);
  res.json({ shortlist });
});

module.exports = { getPipeline, getCandidateReport, shortlistCandidate, listShortlist };
