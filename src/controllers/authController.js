const bcrypt = require('bcryptjs');
const asyncHandler = require('../utils/asyncHandler');
const ApiError = require('../utils/ApiError');
const { signToken } = require('../utils/jwt');
const userModel = require('../models/userModel');
const candidateModel = require('../models/candidateModel');
const employerModel = require('../models/employerModel');
const { logAction } = require('../services/auditService');

const register = asyncHandler(async (req, res) => {
  const { name, email, password, role, companyName } = req.body;

  const existing = await userModel.findByEmail(email);
  if (existing) {
    throw new ApiError(409, 'An account with this email already exists');
  }

  const passwordHash = await bcrypt.hash(password, 10);
  const user = await userModel.createUser({ name, email, passwordHash, role });

  let profile;
  if (role === 'candidate') {
    profile = await candidateModel.createCandidateProfile(user.id);
  } else if (role === 'employer') {
    profile = await employerModel.createEmployerProfile(user.id, companyName);
  }

  await logAction(req, { action: 'REGISTER', entity: 'users', entityId: user.id });

  const token = signToken({
    id: user.id,
    role: user.role,
    candidateId: role === 'candidate' ? profile.id : undefined,
    employerId: role === 'employer' ? profile.id : undefined,
  });

  res.status(201).json({ user, token });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await userModel.findByEmail(email);
  if (!user) {
    throw new ApiError(401, 'Invalid email or password');
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    throw new ApiError(401, 'Invalid email or password');
  }

  let candidateId;
  let employerId;
  if (user.role === 'candidate') {
    const candidate = await candidateModel.findByUserId(user.id);
    candidateId = candidate ? candidate.id : undefined;
  } else if (user.role === 'employer') {
    const employer = await employerModel.findByUserId(user.id);
    employerId = employer ? employer.id : undefined;
  }

  const token = signToken({ id: user.id, role: user.role, candidateId, employerId });

  await logAction(req, { action: 'LOGIN', entity: 'users', entityId: user.id });

  res.json({
    user: { id: user.id, name: user.name, email: user.email, role: user.role },
    candidateId,
    employerId,
    token,
  });
});

const me = asyncHandler(async (req, res) => {
  const user = await userModel.findById(req.user.id);
  if (!user) throw new ApiError(404, 'User not found');
  res.json({ user, ...req.user });
});

module.exports = { register, login, me };
