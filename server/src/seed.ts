import { connectDatabase, disconnectDatabase } from './config/database.js';
import { Application } from './models/Application.js';
import { User } from './models/User.js';

async function seed() {
  await connectDatabase();
  await Promise.all([User.deleteMany({}), Application.deleteMany({})]);

  const agentOne = await User.create({
    name: 'Agent One',
    email: 'agent1@partner.com',
    role: 'agent',
  });
  agentOne.agentId = agentOne._id.toString();
  await agentOne.save();

  const agentTwo = await User.create({
    name: 'Agent Two',
    email: 'agent2@partner.com',
    role: 'agent',
  });
  agentTwo.agentId = agentTwo._id.toString();
  await agentTwo.save();

  const counsellor = await User.create({
    name: 'Sarah Counsellor',
    email: 'counsellor@studynow.com',
    role: 'counsellor',
  });

  const qaOfficer = await User.create({
    name: 'James QA',
    email: 'qa@studynow.com',
    role: 'qa_officer',
  });

  const admission = await User.create({
    name: 'Priya Admission',
    email: 'admission@studynow.com',
    role: 'admission_officer',
  });

  await Application.create([
    {
      stage: 'new_app',
      student: { name: 'Alice Student', email: 'alice@example.com', nationality: 'Nigeria' },
      course: { name: 'MSc Computer Science', university: 'University of Manchester', intake: 'Sep 2026' },
      agentId: agentOne._id.toString(),
    },
    {
      stage: 'qa_review',
      student: { name: 'Bob Student', email: 'bob@example.com', nationality: 'India' },
      course: { name: 'MBA', university: 'University of Leeds', intake: 'Jan 2027' },
      agentId: agentOne._id.toString(),
      documents: [
        { type: 'passport', url: 'https://example.com/passport.pdf', uploadedBy: agentOne._id.toString(), uploadedAt: new Date() },
      ],
    },
    {
      stage: 'app_review',
      student: { name: 'Carol Student', email: 'carol@example.com', nationality: 'Ghana' },
      course: { name: 'LLM Law', university: 'Kings College London', intake: 'Sep 2026' },
      agentId: agentTwo._id.toString(),
      documents: [
        { type: 'passport', url: 'https://example.com/p1.pdf', uploadedBy: agentTwo._id.toString(), uploadedAt: new Date() },
        { type: 'transcript', url: 'https://example.com/t1.pdf', uploadedBy: agentTwo._id.toString(), uploadedAt: new Date() },
        { type: 'english_test', url: 'https://example.com/e1.pdf', uploadedBy: agentTwo._id.toString(), uploadedAt: new Date() },
      ],
    },
  ]);

  console.log('Seed complete. Sample user IDs:');
  console.log({
    agentOne: agentOne._id.toString(),
    agentTwo: agentTwo._id.toString(),
    counsellor: counsellor._id.toString(),
    qaOfficer: qaOfficer._id.toString(),
    admission: admission._id.toString(),
  });

  await disconnectDatabase();
}

seed().catch((err) => {
  console.error(err);
  process.exit(1);
});
