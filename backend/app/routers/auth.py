from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from .. import models, schemas
from ..database import get_db
from ..auth import authenticate_user, create_access_token, require_roles, hash_password, get_current_user

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/login", response_model=schemas.TokenOut)
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Incorrect username or password")
    token = create_access_token({"sub": user.username, "role": user.role.value})
    return schemas.TokenOut(
        access_token=token,
        role=user.role.value,
        username=user.username,
        employee_id=user.employee_id,
    )


@router.get("/me", response_model=schemas.UserOut)
def me(user: models.User = Depends(get_current_user)):
    return schemas.UserOut(
        id=user.id, username=user.username, role=user.role.value, employee_id=user.employee_id
    )


@router.post("/users", response_model=schemas.UserOut, status_code=201)
def create_user(
    payload: schemas.UserCreate,
    db: Session = Depends(get_db),
    _admin: models.User = Depends(require_roles(models.UserRole.admin)),
):
    if db.query(models.User).filter(models.User.username == payload.username).first():
        raise HTTPException(400, "Username already exists")
    if payload.role not in [r.value for r in models.UserRole]:
        raise HTTPException(400, f"Invalid role. Must be one of: {[r.value for r in models.UserRole]}")

    user = models.User(
        username=payload.username,
        hashed_password=hash_password(payload.password),
        role=models.UserRole(payload.role),
        employee_id=payload.employee_id,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return schemas.UserOut(id=user.id, username=user.username, role=user.role.value, employee_id=user.employee_id)