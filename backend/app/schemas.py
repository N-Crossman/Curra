import uuid
from datetime import datetime
from decimal import Decimal
from typing import Optional

from pydantic import BaseModel, ConfigDict, EmailStr

from app.models import (
    AppointmentStatus,
    AppointmentType,
    CareTeamStatus,
    EnergyLevel,
    MedicationFrequency,
    MedicationLogStatus,
    MoodLevel,
    UserRole,
)


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserCreate(BaseModel):
    email: EmailStr
    full_name: str
    password: str
    role: UserRole


class UserUpdate(BaseModel):
    full_name: Optional[str] = None
    is_active: Optional[bool] = None


class UserOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    email: EmailStr
    full_name: str
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# PatientProfile
# ---------------------------------------------------------------------------

class PatientProfileCreate(BaseModel):
    date_of_birth: Optional[datetime] = None
    condition: Optional[str] = None
    diagnosis_date: Optional[datetime] = None
    blood_type: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    notes: Optional[str] = None


class PatientProfileUpdate(BaseModel):
    date_of_birth: Optional[datetime] = None
    condition: Optional[str] = None
    diagnosis_date: Optional[datetime] = None
    blood_type: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    notes: Optional[str] = None


class PatientProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    date_of_birth: Optional[datetime] = None
    condition: Optional[str] = None
    diagnosis_date: Optional[datetime] = None
    blood_type: Optional[str] = None
    emergency_contact: Optional[str] = None
    emergency_phone: Optional[str] = None
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# DoctorProfile
# ---------------------------------------------------------------------------

class DoctorProfileCreate(BaseModel):
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


class DoctorProfileUpdate(BaseModel):
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


class DoctorProfileOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: uuid.UUID
    specialty: Optional[str] = None
    hospital: Optional[str] = None
    phone: Optional[str] = None
    bio: Optional[str] = None


# ---------------------------------------------------------------------------
# CareTeamMember
# ---------------------------------------------------------------------------

class CareTeamMemberCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    role_label: Optional[str] = None
    status: CareTeamStatus = CareTeamStatus.pending


class CareTeamMemberUpdate(BaseModel):
    role_label: Optional[str] = None
    status: Optional[CareTeamStatus] = None


class CareTeamMemberOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: uuid.UUID
    role_label: Optional[str] = None
    status: CareTeamStatus


# ---------------------------------------------------------------------------
# Medication
# ---------------------------------------------------------------------------

class MedicationCreate(BaseModel):
    patient_id: uuid.UUID
    prescribed_by: Optional[uuid.UUID] = None
    name: str
    generic_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[MedicationFrequency] = None
    times_of_day: Optional[list[str]] = None
    category: Optional[str] = None
    instructions: Optional[str] = None
    refill_date: Optional[datetime] = None
    is_active: bool = True
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class MedicationUpdate(BaseModel):
    prescribed_by: Optional[uuid.UUID] = None
    name: Optional[str] = None
    generic_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[MedicationFrequency] = None
    times_of_day: Optional[list[str]] = None
    category: Optional[str] = None
    instructions: Optional[str] = None
    refill_date: Optional[datetime] = None
    is_active: Optional[bool] = None
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class MedicationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    prescribed_by: Optional[uuid.UUID] = None
    name: str
    generic_name: Optional[str] = None
    dosage: Optional[str] = None
    frequency: Optional[MedicationFrequency] = None
    times_of_day: Optional[list[str]] = None
    category: Optional[str] = None
    instructions: Optional[str] = None
    refill_date: Optional[datetime] = None
    is_active: bool
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# MedicationLog
# ---------------------------------------------------------------------------

class MedicationLogCreate(BaseModel):
    medication_id: uuid.UUID
    patient_id: uuid.UUID
    scheduled_time: Optional[datetime] = None
    taken_at: Optional[datetime] = None
    status: MedicationLogStatus
    notes: Optional[str] = None


class MedicationLogUpdate(BaseModel):
    taken_at: Optional[datetime] = None
    status: Optional[MedicationLogStatus] = None
    notes: Optional[str] = None


class MedicationLogOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    medication_id: uuid.UUID
    patient_id: uuid.UUID
    scheduled_time: Optional[datetime] = None
    taken_at: Optional[datetime] = None
    status: MedicationLogStatus
    notes: Optional[str] = None


# ---------------------------------------------------------------------------
# Appointment
# ---------------------------------------------------------------------------

class AppointmentCreate(BaseModel):
    patient_id: uuid.UUID
    doctor_id: Optional[uuid.UUID] = None
    title: str
    type: AppointmentType
    status: AppointmentStatus = AppointmentStatus.scheduled
    scheduled_at: datetime
    duration_mins: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    prep_notes: Optional[str] = None


class AppointmentUpdate(BaseModel):
    doctor_id: Optional[uuid.UUID] = None
    title: Optional[str] = None
    type: Optional[AppointmentType] = None
    status: Optional[AppointmentStatus] = None
    scheduled_at: Optional[datetime] = None
    duration_mins: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    prep_notes: Optional[str] = None


class AppointmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    doctor_id: Optional[uuid.UUID] = None
    title: str
    type: AppointmentType
    status: AppointmentStatus
    scheduled_at: datetime
    duration_mins: Optional[int] = None
    location: Optional[str] = None
    notes: Optional[str] = None
    prep_notes: Optional[str] = None
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# LabPanel
# ---------------------------------------------------------------------------

class LabPanelCreate(BaseModel):
    patient_id: uuid.UUID
    ordered_by: Optional[uuid.UUID] = None
    panel_name: str
    drawn_at: Optional[datetime] = None
    lab_name: Optional[str] = None
    notes: Optional[str] = None


class LabPanelUpdate(BaseModel):
    ordered_by: Optional[uuid.UUID] = None
    panel_name: Optional[str] = None
    drawn_at: Optional[datetime] = None
    lab_name: Optional[str] = None
    notes: Optional[str] = None


class LabPanelOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    ordered_by: Optional[uuid.UUID] = None
    panel_name: str
    drawn_at: Optional[datetime] = None
    lab_name: Optional[str] = None
    notes: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# LabValue
# ---------------------------------------------------------------------------

class LabValueCreate(BaseModel):
    panel_id: uuid.UUID
    test_name: str
    value: Optional[Decimal] = None
    unit: Optional[str] = None
    reference_min: Optional[Decimal] = None
    reference_max: Optional[Decimal] = None


class LabValueUpdate(BaseModel):
    test_name: Optional[str] = None
    value: Optional[Decimal] = None
    unit: Optional[str] = None
    reference_min: Optional[Decimal] = None
    reference_max: Optional[Decimal] = None


class LabValueOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    panel_id: uuid.UUID
    test_name: str
    value: Optional[Decimal] = None
    unit: Optional[str] = None
    reference_min: Optional[Decimal] = None
    reference_max: Optional[Decimal] = None


# ---------------------------------------------------------------------------
# Vital
# ---------------------------------------------------------------------------

class VitalCreate(BaseModel):
    patient_id: uuid.UUID
    recorded_at: datetime
    weight_lbs: Optional[Decimal] = None
    temp_f: Optional[Decimal] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    oxygen_sat: Optional[Decimal] = None
    notes: Optional[str] = None


class VitalUpdate(BaseModel):
    recorded_at: Optional[datetime] = None
    weight_lbs: Optional[Decimal] = None
    temp_f: Optional[Decimal] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    oxygen_sat: Optional[Decimal] = None
    notes: Optional[str] = None


class VitalOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    recorded_at: datetime
    weight_lbs: Optional[Decimal] = None
    temp_f: Optional[Decimal] = None
    systolic_bp: Optional[int] = None
    diastolic_bp: Optional[int] = None
    heart_rate: Optional[int] = None
    oxygen_sat: Optional[Decimal] = None
    notes: Optional[str] = None
    created_at: datetime


# ---------------------------------------------------------------------------
# JournalEntry
# ---------------------------------------------------------------------------

class JournalEntryCreate(BaseModel):
    patient_id: uuid.UUID
    entry_text: str
    mood: Optional[MoodLevel] = None
    energy: Optional[EnergyLevel] = None
    symptoms: Optional[list[str]] = None
    is_private: bool = True


class JournalEntryUpdate(BaseModel):
    entry_text: Optional[str] = None
    mood: Optional[MoodLevel] = None
    energy: Optional[EnergyLevel] = None
    symptoms: Optional[list[str]] = None
    is_private: Optional[bool] = None


class JournalEntryOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    patient_id: uuid.UUID
    entry_text: str
    mood: Optional[MoodLevel] = None
    energy: Optional[EnergyLevel] = None
    symptoms: Optional[list[str]] = None
    is_private: bool
    created_at: datetime
    updated_at: datetime


# ---------------------------------------------------------------------------
# Message
# ---------------------------------------------------------------------------

class MessageCreate(BaseModel):
    sender_id: uuid.UUID
    receiver_id: uuid.UUID
    subject: Optional[str] = None
    body: str


class MessageUpdate(BaseModel):
    is_read: Optional[bool] = None
    read_at: Optional[datetime] = None


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    sender_id: uuid.UUID
    receiver_id: uuid.UUID
    subject: Optional[str] = None
    body: str
    is_read: bool
    read_at: Optional[datetime] = None
    created_at: datetime
