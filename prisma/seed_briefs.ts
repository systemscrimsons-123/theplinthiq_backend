import { PrismaClient, BriefType, CareerStage, ScaleRange, BriefStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function seedBriefs() {
  console.log('🌱 [THE PLINTH IQ SEED] Seeding real database opportunities & briefs...');

  // 1. Locate gallery, art_professional, and collector users
  const gallery = await prisma.user.findFirst({
    where: { role: 'gallery' },
    select: { id: true, email1: true, galleryProfile: { select: { galleryName: true } } },
  });

  const artProfessional = await prisma.user.findFirst({
    where: { role: 'art_professional' },
    select: { id: true, email1: true, artProfessionalProfile: { select: { displayName: true } } },
  });

  const collector = await prisma.user.findFirst({
    where: { role: 'collector' },
    select: { id: true, email1: true },
  });

  if (!gallery || !artProfessional || !collector) {
    throw new Error('Required gallery, art_professional, and collector users must exist in database.');
  }

  console.log(`   Gallery: ${gallery.galleryProfile?.galleryName || gallery.email1} (${gallery.id})`);
  console.log(`   Art Professional: ${artProfessional.artProfessionalProfile?.displayName || artProfessional.email1} (${artProfessional.id})`);
  console.log(`   Collector: ${collector.email1} (${collector.id})`);

  // 2. Fetch medium taxonomy terms
  const terms = await prisma.taxonomyTerm.findMany({
    where: { category: 'medium' },
  });
  const termMap = new Map(terms.map((t) => [t.label.toLowerCase(), t.id]));

  const getMediumIds = (labels: string[]) => {
    return labels
      .map((lbl) => termMap.get(lbl.toLowerCase()))
      .filter((id): id is string => Boolean(id));
  };

  const briefsData = [
    {
      postedByUserId: gallery.id,
      briefType: BriefType.gallery_open_call,
      title: 'Emerging Contemporary Artists: Open Call 2026',
      description:
        'We invite emerging and mid-career artists from South Asia and the diaspora working across painting, sculpture, and mixed media to submit work for our upcoming season exhibition. Selected artists will receive complete exhibition production support, gallery representation consideration, and publication in our biannual catalogue.',
      opportunityType: 'Gallery Open Call',
      exhibitionTheme: 'Contemporary Identities & Material Practice',
      requiredCareerStages: [CareerStage.emerging, CareerStage.mid_career],
      scaleRequirements: [ScaleRange.small, ScaleRange.medium],
      location: 'Mumbai, India',
      submissionDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
      eventStartDate: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      eventEndDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      artistRequirements: 'Open to artists with an active studio practice. Must have up to 10 portfolio pieces available for review.',
      additionalInfo: 'Final selection announced within 3 weeks of closing deadline. Transport and installation covered by the gallery.',
      status: BriefStatus.published,
      mediums: ['Painting', 'Sculpture', 'Mixed Media'],
      image: '/images/opportunities/opp_emerging_artist.jpg',
    },
    {
      postedByUserId: gallery.id,
      briefType: BriefType.gallery_open_call,
      title: 'Reframing Landscape & Urban Realities',
      description:
        'A curated survey exhibition addressing the physical and psychological topography of modern cities, urban migration, and environmental shifts. We are looking for compelling lens-based, video, and sculptural works that engage with architecture, public memory, and contested urban space.',
      opportunityType: 'Thematic Exhibition',
      exhibitionTheme: 'Urban Geographies',
      requiredCareerStages: [CareerStage.mid_career, CareerStage.established],
      scaleRequirements: [ScaleRange.medium, ScaleRange.large],
      location: 'New Delhi, India',
      submissionDeadline: new Date(Date.now() + 45 * 24 * 60 * 60 * 1000),
      eventStartDate: new Date(Date.now() + 75 * 24 * 60 * 60 * 1000),
      eventEndDate: new Date(Date.now() + 110 * 24 * 60 * 60 * 1000),
      artistRequirements: 'High-resolution documentation required. Site-specific proposals welcome.',
      additionalInfo: 'Curatorial fees and travel allowance provided for exhibiting artists.',
      status: BriefStatus.published,
      mediums: ['Photography', 'Video / Film', 'Installation'],
      image: '/images/opportunities/opp_reframing_landscape.jpg',
    },
    {
      postedByUserId: artProfessional.id,
      briefType: BriefType.curatorial_brief,
      title: 'Materiality & Memory: Biennial Curatorial Project',
      description:
        'An independent curatorial initiative exploring textile, fibre, clay, and tactile assemblages as repositories of ancestral and cultural memory. Artists are invited to pitch existing works or proposed installations that celebrate indigenous craftsmanship through contemporary visual vocabulary.',
      opportunityType: 'Curatorial Project',
      exhibitionTheme: 'Memory & Tactility',
      requiredCareerStages: [CareerStage.emerging, CareerStage.mid_career],
      scaleRequirements: [ScaleRange.medium, ScaleRange.large],
      location: 'Bengaluru, India',
      submissionDeadline: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000),
      eventStartDate: new Date(Date.now() + 50 * 24 * 60 * 60 * 1000),
      eventEndDate: new Date(Date.now() + 80 * 24 * 60 * 60 * 1000),
      artistRequirements: 'Focused on sculptural, textile, and spatial explorations.',
      additionalInfo: 'Curated by Art Professional Aditi for public institutional display.',
      status: BriefStatus.published,
      mediums: ['Textile / Fibre', 'Sculpture', 'Installation'],
      image: '/images/opportunities/opp_materiality_memory.jpg',
    },
    {
      postedByUserId: artProfessional.id,
      briefType: BriefType.curatorial_brief,
      title: 'Riverside Arts Residency & Production Grant',
      description:
        'A 6-week funded artist residency offering studio space, technical mentoring, a living stipend, and a material production grant. Concludes with a group presentation and public catalogue launch.',
      opportunityType: 'Residency & Grant',
      exhibitionTheme: 'Process, Ecology & Site',
      requiredCareerStages: [CareerStage.emerging],
      scaleRequirements: [ScaleRange.small, ScaleRange.medium],
      location: 'London & New Delhi',
      submissionDeadline: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
      eventStartDate: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
      eventEndDate: new Date(Date.now() + 82 * 24 * 60 * 60 * 1000),
      artistRequirements: 'Applicants must commit to full-time presence during the 6-week period.',
      additionalInfo: 'Includes private studio, material stipend (£2,500), and accommodation.',
      status: BriefStatus.published,
      mediums: ['Painting', 'Printmaking', 'Drawing'],
      image: '/images/opportunities/opp_riverside_residency.jpg',
    },
    {
      postedByUserId: collector.id,
      briefType: BriefType.patronage_brief,
      title: 'Private Collection Commission: Contemporary Sculptural Works',
      description:
        'A private collector is commissioning two medium-to-large contemporary sculptural or ceramic pieces for a dedicated architectural residence in Mumbai. Looking for artists working with natural stones, cast bronze, terracotta, or experimental ceramics.',
      opportunityType: 'Patronage Commission',
      exhibitionTheme: 'Architectural Interventions',
      requiredCareerStages: [CareerStage.emerging, CareerStage.mid_career, CareerStage.established],
      scaleRequirements: [ScaleRange.medium, ScaleRange.large],
      location: 'Mumbai, India',
      submissionDeadline: new Date(Date.now() + 60 * 24 * 60 * 60 * 1000),
      eventStartDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
      eventEndDate: new Date(Date.now() + 180 * 24 * 60 * 60 * 1000),
      artistRequirements: 'Submit portfolio pieces demonstrating previous sculpture/installation experience.',
      additionalInfo: 'Full fabrication budget and artist honorarium guaranteed upon selection.',
      status: BriefStatus.published,
      mediums: ['Sculpture', 'Ceramics', 'Installation'],
      image: '/images/opportunities/opp_art_changing_world.jpg',
    },
    {
      postedByUserId: artProfessional.id,
      briefType: BriefType.curatorial_brief,
      title: 'Voices of the Global South: Digital & New Media Grant',
      description:
        'A global research and production fellowship supporting artists developing provocative digital, new media, and video works exploring decolonial perspectives, digital vernaculars, and community storytelling.',
      opportunityType: 'Research & Fellowship',
      exhibitionTheme: 'Digital Futures',
      requiredCareerStages: [CareerStage.emerging, CareerStage.mid_career],
      scaleRequirements: [ScaleRange.small, ScaleRange.medium, ScaleRange.large],
      location: 'Global / Online',
      submissionDeadline: new Date(Date.now() + 40 * 24 * 60 * 60 * 1000),
      eventStartDate: new Date(Date.now() + 65 * 24 * 60 * 60 * 1000),
      eventEndDate: new Date(Date.now() + 120 * 24 * 60 * 60 * 1000),
      artistRequirements: 'Digital portfolio and short project concept (up to 500 words).',
      additionalInfo: 'Supported by international foundation partners with virtual showcase.',
      status: BriefStatus.published,
      mediums: ['Digital / New Media', 'Mixed Media', 'Video / Film'],
      image: '/images/opportunities/opp_voices_global_south.jpg',
    },
  ];

  for (const b of briefsData) {
    const mediumIds = getMediumIds(b.mediums);
    const existing = await prisma.brief.findFirst({
      where: { title: b.title, postedByUserId: b.postedByUserId },
    });

    if (!existing) {
      const created = await prisma.brief.create({
        data: {
          postedByUserId: b.postedByUserId,
          briefType: b.briefType,
          title: b.title,
          description: b.description,
          opportunityType: b.opportunityType,
          exhibitionTheme: b.exhibitionTheme,
          requiredCareerStages: b.requiredCareerStages,
          scaleRequirements: b.scaleRequirements,
          location: b.location,
          submissionDeadline: b.submissionDeadline,
          eventStartDate: b.eventStartDate,
          eventEndDate: b.eventEndDate,
          artistRequirements: b.artistRequirements,
          additionalInfo: b.additionalInfo,
          status: b.status,
          images: {
            create: [{ imageUrl: b.image, sortOrder: 0 }],
          },
        },
      });

      if (mediumIds.length) {
        await prisma.briefMedium.createMany({
          data: mediumIds.map((mediumId) => ({ briefId: created.id, mediumId })),
          skipDuplicates: true,
        });
      }

      console.log(`   ✅ Created Brief: "${created.title}" [${created.briefType}] (ID: ${created.id})`);
    } else {
      console.log(`   ℹ️ Brief already exists: "${existing.title}"`);
    }
  }

  const total = await prisma.brief.count();
  console.log(`\n🎉 Total briefs in database: ${total}\n`);
}

seedBriefs()
  .catch((e) => {
    console.error('❌ Error seeding briefs:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
