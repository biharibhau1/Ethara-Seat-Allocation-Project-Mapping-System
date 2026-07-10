"""
Seed script — generates sample data per assessment spec, with department-
weighted + project-weighted headcounts and a single dedicated leadership
floor.

Departments (5000 employees total):
  - Research & Development : 25
  - Growth (HR, Finance, and related roles)  : 100
  - Technical               : 1,500
  - STEM                    : 2,000
  - Non-STEM                : remainder (~1,375)

Projects (19 total), grouped by department:
  - Research & Development -> "Research & Development" (1 project)
  - Growth                 -> "Growth" (1 project; HR/Finance/People roles)
  - Technical               -> Kaiju, Vindex, Talos, Leviathan, Gohan, Vajeta,
                                Yeager, Valkarie (8 projects)
  - STEM                    -> Skyforge, Valor, Fenrir (3 projects; Skyforge
                                and Fenrir are the largest headcount)
  - Non-STEM                -> Text-to-Image Compare, Omni-ELO, Multimodal
                                Annotation, Rubric Design, Dialogue
                                Evaluation, Data Labeling Ops (6 projects) —
                                named after Ethara's actual RLHF/evaluation
                                service lines (ethara.ai/services)

Seating — Floor 1 is the ONE dedicated leadership floor:
  - Zone-A is fixed as the R&D area: all 25 R&D employees seated there
    (open-plan, not cabins).
  - Zone-B is fixed as the Growth area: all 100 Growth employees seated
    there (open-plan, not cabins).
  - 30 individual cabins (carved from zones C-J), for a promoted pool of
    30 employees pulled from Technical/STEM/Non-STEM and given Manager/
    Senior Manager/Department Head/CEO/CFO/CTO titles — their real
    department/project is unchanged, only their seating floor + displayed
    role differ.
  - 15 meeting-room seats and 25 waiting-area seats (also from zones C-J) —
    shared facility space, not individually allocated (kept `reserved`).
  - Everything else on floor 1 (within Zone-A/B past the 25/100 used, and
    the rest of zones C-J) is spare capacity (mostly `available`, some
    `reserved`/`maintenance`) — floor 1 keeps the same 1100-seat total as
    every other floor so the building still meets the assessment's 5,500-
    seat minimum; only the *composition* is special.

Floors 2-5 house the remaining individual-contributor Technical/STEM/
Non-STEM employees, competing for those floors' occupied targets:
Floor 2: 1053/1100, Floor 3: 888/1100, Floor 4: 969/1100, Floor 5: 730/1100.
The IC population (4875 minus the 30 promoted = 4845) is larger than the
seats available across floors 2-5 (3640), so the shortfall becomes
"pending allocation" — expected now that only one floor is leadership space.

Run: python -m app.seed  (from backend/ dir)
"""
import random

from faker import Faker

from .database import Base, engine, SessionLocal
from . import models
from .auth import hash_password

fake = Faker()
random.seed(42)

# ---------------------------------------------------------------------------
# Departments
# ---------------------------------------------------------------------------
DEPT_RD = "Research & Development"
DEPT_GROWTH = "Growth"
DEPT_TECHNICAL = "Technical"
DEPT_STEM = "STEM"
DEPT_NONSTEM = "Non-STEM"

DEPARTMENT_COUNTS = {
    DEPT_RD: 25,
    DEPT_GROWTH: 100,
    DEPT_TECHNICAL: 1500,
    DEPT_STEM: 2000,
    # Non-STEM = everyone left over
    DEPT_NONSTEM: 5000 - (25 + 100 + 1500 + 2000),
}

# ---------------------------------------------------------------------------
# Projects, grouped by department. Weights control relative headcount
# *within* a department's project pool.
# ---------------------------------------------------------------------------
PROJECTS_BY_DEPT = {
    DEPT_RD: [("Research & Development", 1)],
    DEPT_GROWTH: [("Growth", 1)],
    DEPT_TECHNICAL: [
        ("Kaiju", 1), ("Vindex", 1), ("Talos", 1), ("Leviathan", 1),
        ("Gohan", 1), ("Vajeta", 1), ("Yeager", 1), ("Valkarie", 1),
    ],
    DEPT_STEM: [
        ("Skyforge", 4), ("Fenrir", 4), ("Valor", 1),
    ],
    DEPT_NONSTEM: [
        ("Text-to-Image Compare", 1), ("Omni-ELO", 1),
        ("Multimodal Annotation", 1), ("Rubric Design", 1),
        ("Dialogue Evaluation", 1), ("Data Labeling Ops", 1),
    ],
}

# ---------------------------------------------------------------------------
# Roles per department (non-senior / individual-contributor roles)
# ---------------------------------------------------------------------------
ROLES_BY_DEPT = {
    DEPT_RD: ["Research Scientist", "Research Engineer", "Applied Researcher"],
    DEPT_GROWTH: [
        "HR Executive", "HR Manager", "Finance Analyst", "Finance Executive",
        "Growth Marketer", "Recruiter", "People Ops Associate",
    ],
    DEPT_TECHNICAL: [
        "Software Engineer", "Senior Software Engineer", "QA Engineer",
        "DevOps Engineer", "Backend Engineer", "Frontend Engineer",
    ],
    DEPT_STEM: [
        "Data Scientist", "ML Engineer", "Applied Scientist",
        "Research Data Analyst", "AI Engineer",
    ],
    DEPT_NONSTEM: [
        "Data Annotator", "QA Reviewer", "Rubric Designer",
        "Evaluation Specialist", "Content Reviewer", "Ops Analyst",
    ],
}

# Leadership roles handed to the extra "senior" pool pulled from
# Technical/STEM/Non-STEM to fill out the leadership floor.
SENIOR_ROLES = ["Manager", "Senior Manager", "Team Lead", "Department Head"]
C_SUITE_ROLES = ["CEO", "CFO", "CTO"]

LEADERSHIP_FLOOR = 1
IC_FLOORS = [2, 3, 4, 5]

# Leadership floor facility layout.
RD_AREA_ZONE = "Zone-A"       # fixed area for the entire R&D dept
GROWTH_AREA_ZONE = "Zone-B"   # fixed area for the entire Growth dept
CABIN_COUNT = 30              # individual cabins for promoted senior/C-suite roles
MEETING_ROOM_SEATS = 15
WAITING_AREA_SEATS = 25

# floor -> target number of occupied *desk/cabin* seats (out of 1100/floor)
FLOOR_OCCUPANCY_TARGET = {
    LEADERSHIP_FLOOR: DEPARTMENT_COUNTS[DEPT_RD] + DEPARTMENT_COUNTS[DEPT_GROWTH] + CABIN_COUNT,  # 25 + 100 + 30 = 155
    2: 1053,
    3: 888,
    4: 969,
    5: 730,
}

FLOORS = [1, 2, 3, 4, 5]
ZONES = [f"Zone-{c}" for c in "ABCDEFGHIJ"]  # 10 zones

# Random split of non-occupied seats across available/reserved/maintenance.
NON_OCCUPIED_STATUS_WEIGHTS = {
    models.SeatStatus.available: 0.75,
    models.SeatStatus.reserved: 0.15,
    models.SeatStatus.maintenance: 0.10,
}


def reset_db():
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)


def weighted_status_choice():
    r = random.random()
    cumulative = 0
    for status, weight in NON_OCCUPIED_STATUS_WEIGHTS.items():
        cumulative += weight
        if r <= cumulative:
            return status
    return models.SeatStatus.available


def weighted_choice(options):
    """options: list of (value, weight) tuples."""
    values = [o[0] for o in options]
    weights = [o[1] for o in options]
    return random.choices(values, weights=weights, k=1)[0]


def build_department_pool():
    """Shuffled list of department labels, one per employee, matching
    DEPARTMENT_COUNTS exactly."""
    pool = []
    for dept, count in DEPARTMENT_COUNTS.items():
        pool.extend([dept] * count)
    random.shuffle(pool)
    return pool


def seed():
    reset_db()
    db = SessionLocal()
    try:
        # --- Projects ---
        project_objs_by_name = {}
        for dept, project_weights in PROJECTS_BY_DEPT.items():
            for name, _weight in project_weights:
                p = models.Project(
                    name=name,
                    description=f"{name} — {dept} project",
                    manager_name=fake.name(),
                    status="active",
                )
                db.add(p)
                project_objs_by_name[name] = p
        db.commit()
        for p in project_objs_by_name.values():
            db.refresh(p)

        # --- Seats: 5 floors x 10 zones x 110 seats = 5500 seats ---
        seats_by_floor = {f: [] for f in FLOORS}
        seats_per_zone = 110  # 5 floors * 10 zones * 110 = 5500
        seat_count = 0
        for floor in FLOORS:
            for zone in ZONES:
                for i in range(seats_per_zone):
                    bay = f"Bay-{(i // 10) + 1}"
                    seat_number = f"{zone.split('-')[1]}{floor}-{i + 1:03d}"
                    seat = models.Seat(
                        floor=floor,
                        zone=zone,
                        bay=bay,
                        seat_number=seat_number,
                        status=models.SeatStatus.available,
                    )
                    db.add(seat)
                    seats_by_floor[floor].append(seat)
                    seat_count += 1
        db.commit()
        for floor_seats in seats_by_floor.values():
            for s in floor_seats:
                db.refresh(s)

        # --- Floor 1: dedicated R&D/Growth zones + cabins/meeting/waiting ---
        floor1_seats_by_zone = {}
        for seat in seats_by_floor[LEADERSHIP_FLOOR]:
            floor1_seats_by_zone.setdefault(seat.zone, []).append(seat)

        rd_count = DEPARTMENT_COUNTS[DEPT_RD]
        growth_count = DEPARTMENT_COUNTS[DEPT_GROWTH]

        rd_zone_seats = floor1_seats_by_zone[RD_AREA_ZONE][:]
        random.shuffle(rd_zone_seats)
        rd_area_seats = rd_zone_seats[:rd_count]
        rd_area_spare = rd_zone_seats[rd_count:]

        growth_zone_seats = floor1_seats_by_zone[GROWTH_AREA_ZONE][:]
        random.shuffle(growth_zone_seats)
        growth_area_seats = growth_zone_seats[:growth_count]
        growth_area_spare = growth_zone_seats[growth_count:]

        # Cabins / meeting rooms / waiting area are carved from the
        # remaining zones (everything except Zone-A and Zone-B).
        other_zone_seats = []
        for zone, zone_seats in floor1_seats_by_zone.items():
            if zone not in (RD_AREA_ZONE, GROWTH_AREA_ZONE):
                other_zone_seats.extend(zone_seats)
        random.shuffle(other_zone_seats)

        cabin_seats = other_zone_seats[:CABIN_COUNT]
        meeting_seats = other_zone_seats[CABIN_COUNT:CABIN_COUNT + MEETING_ROOM_SEATS]
        waiting_seats = other_zone_seats[CABIN_COUNT + MEETING_ROOM_SEATS:CABIN_COUNT + MEETING_ROOM_SEATS + WAITING_AREA_SEATS]
        floor1_remainder = other_zone_seats[CABIN_COUNT + MEETING_ROOM_SEATS + WAITING_AREA_SEATS:]
        floor1_remainder += rd_area_spare + growth_area_spare

        for seat in rd_area_seats:
            seat.bay = "R&D Area"

        for seat in growth_area_seats:
            seat.bay = "Growth Area"

        for seat in cabin_seats:
            seat.bay = "Cabin"
            # status stays 'available' for now; set to occupied at allocation time

        for seat in meeting_seats:
            seat.bay = "Meeting Room"
            seat.status = models.SeatStatus.reserved  # shared facility, not individually allocated

        for seat in waiting_seats:
            seat.bay = "Waiting Area"
            seat.status = models.SeatStatus.reserved  # shared facility, not individually allocated

        for seat in floor1_remainder:
            seat.status = weighted_status_choice()  # spare capacity on the leadership floor

        # --- Floors 2-5: occupancy-target candidates vs. random status ---
        occupied_candidate_seats_by_floor = {}
        for floor in IC_FLOORS:
            floor_seats = seats_by_floor[floor][:]
            random.shuffle(floor_seats)
            target = FLOOR_OCCUPANCY_TARGET[floor]
            candidates = floor_seats[:target]
            remainder = floor_seats[target:]

            occupied_candidate_seats_by_floor[floor] = candidates
            for seat in remainder:
                seat.status = weighted_status_choice()
        db.commit()

        ic_seats = []
        for floor in IC_FLOORS:
            ic_seats.extend(occupied_candidate_seats_by_floor[floor])
        random.shuffle(ic_seats)

        # --- Employees: department assignment (fixed counts, random order) ---
        total_employees = 5000
        dept_pool = build_department_pool()  # length 5000, shuffled

        employees = []
        used_emails = set()
        for i in range(total_employees):
            dept = dept_pool[i]
            emp_code = f"ETH{i + 1:05d}"
            first_last = fake.unique.name()
            email_base = first_last.lower().replace(" ", ".").replace("'", "")
            email = f"{email_base}@ethara.ai"
            suffix = 1
            while email in used_emails:
                email = f"{email_base}{suffix}@ethara.ai"
                suffix += 1
            used_emails.add(email)

            joining_date = fake.date_between(start_date="-3y", end_date="today")
            project_name = weighted_choice(PROJECTS_BY_DEPT[dept])
            project = project_objs_by_name[project_name]
            role = random.choice(ROLES_BY_DEPT[dept])

            emp = models.Employee(
                employee_code=emp_code,
                name=first_last,
                email=email,
                department=dept,
                role=role,
                joining_date=joining_date,
                project_id=project.id,
                status=models.EmployeeStatus.pending_allocation,
            )
            db.add(emp)
            employees.append(emp)

        db.commit()
        for e in employees:
            db.refresh(e)

        # --- Split employees: R&D area / Growth area / cabin pool / IC pool ---
        rd_employees = [e for e in employees if e.department == DEPT_RD]
        growth_employees = [e for e in employees if e.department == DEPT_GROWTH]
        ic_pool_source = [e for e in employees if e.department in (DEPT_TECHNICAL, DEPT_STEM, DEPT_NONSTEM)]

        random.shuffle(rd_employees)
        random.shuffle(growth_employees)
        random.shuffle(ic_pool_source)

        promoted_to_cabins = ic_pool_source[:CABIN_COUNT]
        ic_pool = ic_pool_source[CABIN_COUNT:]

        # Give the promoted group a leadership title (department/project
        # stay exactly as assigned above — only floor + displayed role change).
        for idx, emp in enumerate(promoted_to_cabins):
            if idx < len(C_SUITE_ROLES):
                emp.role = C_SUITE_ROLES[idx]
            else:
                emp.role = random.choice(SENIOR_ROLES)

        # --- Allocate seats ---
        def allocate(emp_seat_pairs):
            for emp, seat in emp_seat_pairs:
                seat.status = models.SeatStatus.occupied
                allocation = models.SeatAllocation(
                    employee_id=emp.id,
                    seat_id=seat.id,
                    project_id=emp.project_id,
                    allocation_status=models.AllocationStatus.active,
                    allocation_date=fake.date_time_between(start_date="-2y", end_date="now"),
                )
                emp.status = models.EmployeeStatus.active
                db.add(allocation)

        allocate(zip(rd_employees, rd_area_seats))
        allocate(zip(growth_employees, growth_area_seats))
        allocate(zip(promoted_to_cabins, cabin_seats))
        allocate(zip(ic_pool, ic_seats))

        # Anyone left over (only possible on the IC side, since R&D/Growth/
        # cabin pool sizes match their seat counts exactly) stays pending.
        for emp in ic_pool[len(ic_seats):]:
            emp.status = models.EmployeeStatus.pending_allocation

        db.commit()

        # --- Sample login users (one per role) ---
        # NOTE: demo credentials only — rotate/remove before any real deployment.
        demo_employee = employees[0]  # deterministic given the fixed random.seed(42)
        sample_users = [
            models.User(username="admin", hashed_password=hash_password("admin123"), role=models.UserRole.admin),
            models.User(username="hr", hashed_password=hash_password("hr123"), role=models.UserRole.hr),
            models.User(username="manager", hashed_password=hash_password("manager123"), role=models.UserRole.manager),
            models.User(
                username="employee",
                hashed_password=hash_password("employee123"),
                role=models.UserRole.employee,
                employee_id=demo_employee.id,
            ),
        ]
        for u in sample_users:
            db.add(u)
        db.commit()

        # --- Summary ---
        print(f"Seed complete: {seat_count} seats, {total_employees} employees, "
              f"{len(project_objs_by_name)} projects")
        print("  Sample login users (username / password / role):")
        print("    admin / admin123 / admin")
        print("    hr / hr123 / hr")
        print("    manager / manager123 / manager")
        print(f"    employee / employee123 / employee (linked to {demo_employee.name}, {demo_employee.employee_code})")
        print("  Departments:")
        for dept, count in DEPARTMENT_COUNTS.items():
            print(f"    {dept}: {count}")

        print(f"  Leadership floor (Floor {LEADERSHIP_FLOOR}): "
              f"R&D area (Zone-A): {rd_count} seated / 110 in zone | "
              f"Growth area (Zone-B): {growth_count} seated / 110 in zone | "
              f"{CABIN_COUNT} cabins | {MEETING_ROOM_SEATS} meeting-room seats | "
              f"{WAITING_AREA_SEATS} waiting-area seats")

        print("  Floors:")
        for floor in FLOORS:
            total = len(seats_by_floor[floor])
            occupied = db.query(models.Seat).filter(
                models.Seat.floor == floor, models.Seat.status == models.SeatStatus.occupied
            ).count()
            label = " (leadership)" if floor == LEADERSHIP_FLOOR else ""
            print(f"    Floor {floor}{label}: {occupied}/{total} occupied "
                  f"(target {FLOOR_OCCUPANCY_TARGET[floor]})")

        final_available = db.query(models.Seat).filter(
            models.Seat.status == models.SeatStatus.available
        ).count()
        final_reserved = db.query(models.Seat).filter(
            models.Seat.status == models.SeatStatus.reserved
        ).count()
        final_maintenance = db.query(models.Seat).filter(
            models.Seat.status == models.SeatStatus.maintenance
        ).count()
        final_pending = db.query(models.Employee).filter(
            models.Employee.status == models.EmployeeStatus.pending_allocation
        ).count()
        print(f"  Available: {final_available}, Reserved: {final_reserved}, Maintenance: {final_maintenance}")
        print(f"  Pending allocation: {final_pending}")

        print("  Project headcounts:")
        counts = []
        for name, p in project_objs_by_name.items():
            c = db.query(models.Employee).filter(models.Employee.project_id == p.id).count()
            counts.append((name, c))
        for name, c in sorted(counts, key=lambda x: -x[1]):
            print(f"    {name}: {c}")
    finally:
        db.close()


if __name__ == "__main__":
    seed()