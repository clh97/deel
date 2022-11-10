const getProfile = async (req, res, next) => {
  const { Profile } = req.app.get('models');
  const profile_id = req.get('profile_id') || 0;
  const profile = await Profile.findOne({
    where: { id: profile_id },
  });
  if (!profile) return res.status(401).end();
  req.profile = profile;
  next();
};
module.exports = { getProfile };
