"""
Seed script — populate demo data for Curra.

Run from the backend directory:
    python -m app.seed
"""

import asyncio
import random
from datetime import datetime, timedelta, timezone

from sqlalchemy import select

from app.database import AsyncSessionLocal, engine, Base
from app.models import (
    Appointment, AppointmentStatus, AppointmentType,
    CareTeamMember, CareTeamStatus,
    DoctorProfile,
    EnergyLevel,
    JournalEntry,
    LabPanel, LabValue,
    Medication, MedicationFrequency, MedicationLog, MedicationLogStatus,
    Message,
    MoodLevel,
    PatientProfile,
    User, UserRole,
    Vital,
)
from app.security import hash_password


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def now_utc() -> datetime:
    return datetime.now(timezone.utc)


def days_ago(n: int, hour: int = 8, minute: int = 0) -> datetime:
    base = now_utc().replace(hour=hour, minute=minute, second=0, microsecond=0)
    return base - timedelta(days=n)


def days_from_now(n: int, hour: int = 10, minute: int = 0) -> datetime:
    base = now_utc().replace(hour=hour, minute=minute, second=0, microsecond=0)
    return base + timedelta(days=n)


# ---------------------------------------------------------------------------
# Seed
# ---------------------------------------------------------------------------

async def seed() -> None:
    # Ensure tables exist
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as db:
        # ------------------------------------------------------------------
        # Wipe existing demo accounts (idempotent re-runs)
        # ------------------------------------------------------------------
        demo_emails = {
            "demo.patient@curra.com",
            "demo.doctor@curra.com",
            "demo.pharmacist@curra.com",
        }
        for email in demo_emails:
            result = await db.execute(select(User).where(User.email == email))
            user = result.scalar_one_or_none()
            if user:
                await db.delete(user)
        await db.commit()

        # ------------------------------------------------------------------
        # Users
        # ------------------------------------------------------------------
        patient = User(
            email="demo.patient@curra.com",
            full_name="Alex Rivera",
            password_hash=hash_password("Demo1234!"),
            role=UserRole.patient,
        )
        doctor = User(
            email="demo.doctor@curra.com",
            full_name="Dr. Sarah Chen",
            password_hash=hash_password("Demo1234!"),
            role=UserRole.doctor,
        )
        pharmacist = User(
            email="demo.pharmacist@curra.com",
            full_name="James Okafor",
            password_hash=hash_password("Demo1234!"),
            role=UserRole.pharmacist,
        )
        db.add_all([patient, doctor, pharmacist])
        await db.flush()  # get UUIDs

        # ------------------------------------------------------------------
        # Profiles
        # ------------------------------------------------------------------
        db.add(PatientProfile(
            user_id=patient.id,
            date_of_birth=datetime(1988, 4, 15, tzinfo=timezone.utc),
            condition="Crohn's Disease",
            diagnosis_date=datetime(2019, 7, 3, tzinfo=timezone.utc),
            blood_type="A+",
            emergency_contact="Maria Rivera",
            emergency_phone="555-0192",
            notes="Diagnosed with moderate Crohn's. Currently in partial remission.",
        ))
        db.add(DoctorProfile(
            user_id=doctor.id,
            specialty="Gastroenterology",
            hospital="City Medical Center",
            phone="555-0147",
            bio="Board-certified gastroenterologist with 12 years of experience in IBD management.",
        ))
        await db.flush()

        # ------------------------------------------------------------------
        # Care team
        # ------------------------------------------------------------------
        db.add(CareTeamMember(
            patient_id=patient.id,
            doctor_id=doctor.id,
            role_label="Primary GI Specialist",
            status=CareTeamStatus.active,
        ))
        await db.flush()

        # ------------------------------------------------------------------
        # Medications  (3 active, 1 inactive)
        # ------------------------------------------------------------------
        med_adalimumab = Medication(
            patient_id=patient.id,
            prescribed_by=doctor.id,
            name="Humira",
            generic_name="Adalimumab",
            dosage="40 mg",
            frequency=MedicationFrequency.every_other_day,
            times_of_day=["morning"],
            category="Biologic",
            instructions="Inject subcutaneously. Rotate injection sites. Refrigerate.",
            start_date=days_ago(120),
            refill_date=days_from_now(10),
            is_active=True,
        )
        med_mesalamine = Medication(
            patient_id=patient.id,
            prescribed_by=doctor.id,
            name="Lialda",
            generic_name="Mesalamine",
            dosage="1200 mg",
            frequency=MedicationFrequency.twice_daily,
            times_of_day=["morning", "evening"],
            category="Anti-inflammatory",
            instructions="Take with food to reduce GI upset.",
            start_date=days_ago(300),
            refill_date=days_from_now(21),
            is_active=True,
        )
        med_probiotic = Medication(
            patient_id=patient.id,
            prescribed_by=doctor.id,
            name="VSL#3",
            generic_name="Probiotic Blend",
            dosage="1 sachet",
            frequency=MedicationFrequency.once_daily,
            times_of_day=["morning"],
            category="Probiotic",
            instructions="Mix with cold water or food. Do not heat.",
            start_date=days_ago(90),
            refill_date=days_from_now(5),
            is_active=True,
        )
        med_old = Medication(
            patient_id=patient.id,
            prescribed_by=doctor.id,
            name="Prednisone",
            generic_name="Prednisolone",
            dosage="20 mg",
            frequency=MedicationFrequency.once_daily,
            times_of_day=["morning"],
            category="Corticosteroid",
            instructions="Taper as directed. Take with food.",
            start_date=days_ago(200),
            end_date=days_ago(60),
            is_active=False,
        )
        db.add_all([med_adalimumab, med_mesalamine, med_probiotic, med_old])
        await db.flush()

        # ------------------------------------------------------------------
        # Medication logs — 30 days
        # ------------------------------------------------------------------
        logs = []
        for day_offset in range(30, 0, -1):
            date = now_utc().replace(hour=0, minute=0, second=0, microsecond=0) - timedelta(days=day_offset)

            # Adalimumab — every other day, ~90% adherence
            if day_offset % 2 == 0:
                scheduled = date.replace(hour=8)
                roll = random.random()
                if roll < 0.90:
                    logs.append(MedicationLog(
                        medication_id=med_adalimumab.id,
                        patient_id=patient.id,
                        scheduled_time=scheduled,
                        taken_at=scheduled + timedelta(minutes=random.randint(0, 45)),
                        status=MedicationLogStatus.taken,
                    ))
                elif roll < 0.95:
                    logs.append(MedicationLog(
                        medication_id=med_adalimumab.id,
                        patient_id=patient.id,
                        scheduled_time=scheduled,
                        status=MedicationLogStatus.missed,
                    ))
                else:
                    logs.append(MedicationLog(
                        medication_id=med_adalimumab.id,
                        patient_id=patient.id,
                        scheduled_time=scheduled,
                        status=MedicationLogStatus.skipped,
                        notes="Traveling — skipped injection",
                    ))

            # Mesalamine — twice daily, ~85% adherence
            for hour in [8, 20]:
                scheduled = date.replace(hour=hour)
                roll = random.random()
                if roll < 0.85:
                    logs.append(MedicationLog(
                        medication_id=med_mesalamine.id,
                        patient_id=patient.id,
                        scheduled_time=scheduled,
                        taken_at=scheduled + timedelta(minutes=random.randint(0, 30)),
                        status=MedicationLogStatus.taken,
                    ))
                else:
                    logs.append(MedicationLog(
                        medication_id=med_mesalamine.id,
                        patient_id=patient.id,
                        scheduled_time=scheduled,
                        status=MedicationLogStatus.missed,
                    ))

            # Probiotic — once daily, ~95% adherence
            scheduled = date.replace(hour=8, minute=30)
            if random.random() < 0.95:
                logs.append(MedicationLog(
                    medication_id=med_probiotic.id,
                    patient_id=patient.id,
                    scheduled_time=scheduled,
                    taken_at=scheduled + timedelta(minutes=random.randint(0, 20)),
                    status=MedicationLogStatus.taken,
                ))
            else:
                logs.append(MedicationLog(
                    medication_id=med_probiotic.id,
                    patient_id=patient.id,
                    scheduled_time=scheduled,
                    status=MedicationLogStatus.missed,
                ))

        db.add_all(logs)
        await db.flush()

        # ------------------------------------------------------------------
        # Lab panels — 3 panels across past 3 months
        # ------------------------------------------------------------------
        panel_cbc = LabPanel(
            patient_id=patient.id,
            ordered_by=doctor.id,
            panel_name="Complete Blood Count (CBC)",
            drawn_at=days_ago(90),
            lab_name="City Medical Lab",
            notes="Routine monitoring for biologic therapy.",
        )
        panel_crp = LabPanel(
            patient_id=patient.id,
            ordered_by=doctor.id,
            panel_name="Inflammatory Markers",
            drawn_at=days_ago(45),
            lab_name="City Medical Lab",
            notes="CRP and ESR to assess disease activity.",
        )
        panel_metabolic = LabPanel(
            patient_id=patient.id,
            ordered_by=doctor.id,
            panel_name="Comprehensive Metabolic Panel",
            drawn_at=days_ago(7),
            lab_name="City Medical Lab",
            notes="Liver and kidney function check.",
        )
        db.add_all([panel_cbc, panel_crp, panel_metabolic])
        await db.flush()

        # CBC values
        db.add_all([
            LabValue(panel_id=panel_cbc.id, test_name="WBC", value=6.2, unit="K/uL", reference_min=4.5, reference_max=11.0),
            LabValue(panel_id=panel_cbc.id, test_name="RBC", value=4.5, unit="M/uL", reference_min=4.2, reference_max=5.4),
            LabValue(panel_id=panel_cbc.id, test_name="Hemoglobin", value=12.8, unit="g/dL", reference_min=12.0, reference_max=16.0),
            LabValue(panel_id=panel_cbc.id, test_name="Hematocrit", value=38.2, unit="%", reference_min=36.0, reference_max=48.0),
            LabValue(panel_id=panel_cbc.id, test_name="Platelets", value=310, unit="K/uL", reference_min=150, reference_max=400),
        ])

        # Inflammatory markers
        db.add_all([
            LabValue(panel_id=panel_crp.id, test_name="C-Reactive Protein", value=8.4, unit="mg/L", reference_min=0.0, reference_max=5.0),
            LabValue(panel_id=panel_crp.id, test_name="ESR", value=32, unit="mm/hr", reference_min=0.0, reference_max=20.0),
            LabValue(panel_id=panel_crp.id, test_name="Fecal Calprotectin", value=180, unit="ug/g", reference_min=0.0, reference_max=50.0),
        ])

        # Metabolic panel
        db.add_all([
            LabValue(panel_id=panel_metabolic.id, test_name="Glucose", value=94, unit="mg/dL", reference_min=70, reference_max=99),
            LabValue(panel_id=panel_metabolic.id, test_name="BUN", value=14, unit="mg/dL", reference_min=7, reference_max=20),
            LabValue(panel_id=panel_metabolic.id, test_name="Creatinine", value=0.9, unit="mg/dL", reference_min=0.6, reference_max=1.2),
            LabValue(panel_id=panel_metabolic.id, test_name="ALT", value=22, unit="U/L", reference_min=7, reference_max=40),
            LabValue(panel_id=panel_metabolic.id, test_name="AST", value=18, unit="U/L", reference_min=10, reference_max=40),
            LabValue(panel_id=panel_metabolic.id, test_name="Albumin", value=3.8, unit="g/dL", reference_min=3.4, reference_max=5.4),
        ])
        await db.flush()

        # ------------------------------------------------------------------
        # Vitals — 14 days
        # ------------------------------------------------------------------
        vitals_data = []
        base_weight = 158.0
        for day_offset in range(14, 0, -1):
            recorded = days_ago(day_offset, hour=7, minute=30)
            weight = round(base_weight + random.uniform(-1.5, 1.5), 1)
            systolic = random.randint(112, 128)
            diastolic = random.randint(72, 82)
            hr = random.randint(62, 78)
            temp = round(random.uniform(98.2, 98.9), 1)
            o2 = round(random.uniform(97.0, 99.5), 1)
            vitals_data.append(Vital(
                patient_id=patient.id,
                recorded_at=recorded,
                weight_lbs=weight,
                temp_f=temp,
                systolic_bp=systolic,
                diastolic_bp=diastolic,
                heart_rate=hr,
                oxygen_sat=o2,
            ))
        db.add_all(vitals_data)
        await db.flush()

        # ------------------------------------------------------------------
        # Appointments — mix of past (completed/cancelled) and upcoming
        # ------------------------------------------------------------------
        db.add_all([
            Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                title="Quarterly GI Check-In",
                type=AppointmentType.routine,
                status=AppointmentStatus.completed,
                scheduled_at=days_ago(60, hour=10),
                duration_mins=30,
                location="City Medical Center — Suite 304",
                notes="Discussed current biologic response. CRP still mildly elevated.",
            ),
            Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                title="Lab Review",
                type=AppointmentType.labs,
                status=AppointmentStatus.completed,
                scheduled_at=days_ago(44, hour=9),
                duration_mins=20,
                location="City Medical Center — Suite 304",
                notes="Reviewed inflammatory markers. Adjusted mesalamine timing.",
            ),
            Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                title="Telehealth — Flare Follow-up",
                type=AppointmentType.telehealth,
                status=AppointmentStatus.completed,
                scheduled_at=days_ago(15, hour=14),
                duration_mins=20,
                notes="Patient reported increased cramping. Monitoring closely.",
            ),
            Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                title="Colonoscopy Prep Review",
                type=AppointmentType.routine,
                status=AppointmentStatus.cancelled,
                scheduled_at=days_ago(5, hour=11),
                duration_mins=15,
                location="City Medical Center — Suite 304",
                notes="Cancelled — patient had fever.",
            ),
            Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                title="Routine GI Follow-Up",
                type=AppointmentType.routine,
                status=AppointmentStatus.scheduled,
                scheduled_at=days_from_now(7, hour=10),
                duration_mins=30,
                location="City Medical Center — Suite 304",
                prep_notes="Bring current medication list. Note any symptom changes since last visit.",
            ),
            Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                title="Colonoscopy",
                type=AppointmentType.imaging,
                status=AppointmentStatus.scheduled,
                scheduled_at=days_from_now(21, hour=8),
                duration_mins=60,
                location="City Medical Center — Endoscopy Unit",
                prep_notes="Follow bowel prep instructions sent by mail. No solid food 24h prior. Arrange a driver.",
            ),
            Appointment(
                patient_id=patient.id,
                doctor_id=doctor.id,
                title="Biologic Infusion Check",
                type=AppointmentType.urgent,
                status=AppointmentStatus.scheduled,
                scheduled_at=days_from_now(35, hour=13),
                duration_mins=45,
                location="City Medical Center — Infusion Suite",
            ),
        ])
        await db.flush()

        # ------------------------------------------------------------------
        # Journal entries — 10 entries over past 14 days
        # ------------------------------------------------------------------
        journal_data = [
            (14, MoodLevel.low, EnergyLevel.low, ["abdominal cramps", "bloating", "fatigue"],
             "Rough day. Cramps started around noon and lasted most of the afternoon. Had to skip the gym. Took an extra rest period after lunch."),
            (12, MoodLevel.neutral, EnergyLevel.medium, ["mild bloating"],
             "A bit better today. Bloating mostly in the evenings. Managed a 20-minute walk which helped. Trying to stick to low-residue foods."),
            (10, MoodLevel.good, EnergyLevel.medium, [],
             "Good day overall. No major symptoms. Met with a friend for lunch — ate carefully and felt fine afterward. Took all medications on time."),
            (8, MoodLevel.neutral, EnergyLevel.low, ["fatigue", "joint pain"],
             "Fatigue hit hard this morning. Joint pain in my knees — wondering if it's the Crohn's extraintestinal stuff again. Mentioned it to Dr. Chen via message."),
            (7, MoodLevel.low, EnergyLevel.low, ["abdominal cramps", "urgency", "fatigue"],
             "Flare-up symptoms returning. Urgency 4-5 times today. Called the clinic — they want me to monitor for 48 hours before adjusting meds."),
            (6, MoodLevel.low, EnergyLevel.low, ["urgency", "nausea"],
             "Still symptomatic. Added plain rice and broth to my diet. Nausea in the morning. Trying to stay hydrated. Grateful the biologic injections are easy to do at home."),
            (4, MoodLevel.neutral, EnergyLevel.medium, ["mild cramping"],
             "Symptoms calming down. Only mild cramping today. Energy slightly better. Going to ease back into normal diet slowly."),
            (3, MoodLevel.good, EnergyLevel.medium, [],
             "Much better. No urgency episodes. Had a full meal for dinner — felt fine. Mood lifting. Looking forward to the upcoming appointment."),
            (1, MoodLevel.good, EnergyLevel.high, [],
             "Great day. High energy, zero GI symptoms. Went for a 4km walk. Sticking to the medication schedule religiously. Feeling hopeful."),
            (0, MoodLevel.great, EnergyLevel.high, [],
             "Best day in weeks. Finished work feeling productive. Cooked a proper dinner. Symptoms fully quiet. Hoping this continues into next week."),
        ]
        for days_back, mood, energy, symptoms, text in journal_data:
            created = days_ago(days_back, hour=21, minute=random.randint(0, 59))
            db.add(JournalEntry(
                patient_id=patient.id,
                entry_text=text,
                mood=mood,
                energy=energy,
                symptoms=symptoms if symptoms else None,
                is_private=True,
                created_at=created,
                updated_at=created,
            ))
        await db.flush()

        # ------------------------------------------------------------------
        # Messages
        # ------------------------------------------------------------------
        db.add_all([
            Message(
                sender_id=doctor.id,
                receiver_id=patient.id,
                subject="Lab Results — Inflammatory Markers",
                body=(
                    "Hi Alex,\n\n"
                    "Your latest CRP came back at 8.4 mg/L — still above normal range. "
                    "I'd like to discuss adjusting your mesalamine dosing at your next visit. "
                    "In the meantime, continue current medications and monitor symptoms.\n\n"
                    "— Dr. Chen"
                ),
                is_read=True,
                read_at=days_ago(43, hour=9),
                created_at=days_ago(44, hour=16),
            ),
            Message(
                sender_id=patient.id,
                receiver_id=doctor.id,
                subject="Joint Pain — is this IBD related?",
                body=(
                    "Hi Dr. Chen,\n\n"
                    "I've been having knee pain for the past couple of days along with fatigue. "
                    "I read that joint issues can be related to Crohn's — is that what I'm experiencing? "
                    "Should I be concerned or wait until the next appointment?\n\n"
                    "Thanks, Alex"
                ),
                is_read=True,
                read_at=days_ago(7, hour=14),
                created_at=days_ago(8, hour=10),
            ),
            Message(
                sender_id=doctor.id,
                receiver_id=patient.id,
                subject="Re: Joint Pain — is this IBD related?",
                body=(
                    "Hi Alex,\n\n"
                    "Yes, peripheral arthropathy is a known extraintestinal manifestation of Crohn's. "
                    "It often parallels gut disease activity. Since your CRP was elevated, this fits the picture. "
                    "Keep an eye on it — if it worsens or you develop fever, contact us right away. "
                    "We'll assess it at your visit next week.\n\n"
                    "— Dr. Chen"
                ),
                is_read=True,
                read_at=days_ago(6, hour=9),
                created_at=days_ago(7, hour=15),
            ),
            Message(
                sender_id=doctor.id,
                receiver_id=patient.id,
                subject="Appointment Reminder — Next Week",
                body=(
                    "Hi Alex,\n\n"
                    "Just a reminder that your routine GI follow-up is scheduled for next week. "
                    "Please bring your current medication list and any symptom notes from the past few weeks. "
                    "Feel free to write down any questions you have beforehand.\n\n"
                    "See you soon,\nDr. Chen"
                ),
                is_read=False,
                created_at=days_ago(2, hour=11),
            ),
        ])
        await db.flush()

        # Commit everything
        await db.commit()

    print("Seed complete.")
    print("  Patient:    demo.patient@curra.com     / Demo1234!")
    print("  Doctor:     demo.doctor@curra.com      / Demo1234!")
    print("  Pharmacist: demo.pharmacist@curra.com  / Demo1234!")


if __name__ == "__main__":
    asyncio.run(seed())
