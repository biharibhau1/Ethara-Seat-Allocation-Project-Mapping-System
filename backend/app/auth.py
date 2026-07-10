"""
Authentication & role-based access control.

Roles: admin, hr, manager (project lead / team manager), employee.

- admin: full access to everything.
- hr: manage employees, allocate/release seats. Cannot create projects/seats
  or manage other users.
- manager: read access + can view/manage employees within their own
  project (enforced at the router level where relevant).
- employee: read-only access to search/dashboard/AI assistant. Cannot
  create/update/delete employees, projects, or seats, and cannot allocate/
  release seats on behalf of others.

Uses bcrypt directly (not passlib) — passlib's bcrypt backend has a known
version-compatibility bug with bcrypt>=4.1 (raises "password cannot be
longer than 72 bytes" / "_bcrypt has no attribute __about__" even for
short passwords).
"""
import os
from datetime import datetime, timedelta
from typing import Optional

import bcrypt
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from . import models
from .database import get_db

# In production, set JWT_SECRET_KEY as a real environment variable/secret —
# this default is only for local/demo use.
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "ethara-dev-secret-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 8  # 8 hours

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))


def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def authenticate_user(db: Session, username: str, password: str):
    user = db.query(models.User).filter(models.User.username == username).first()
    if not user or not verify_password(password, user.hashed_password):
        return None
    return user


def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)) -> models.User:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(models.User).filter(models.User.username == username).first()
    if user is None:
        raise credentials_exception
    return user


def require_roles(*allowed_roles: models.UserRole):
    """Dependency factory: require_roles(models.UserRole.admin, models.UserRole.hr)"""
    def checker(user: models.User = Depends(get_current_user)) -> models.User:
        if user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"This action requires one of these roles: {[r.value for r in allowed_roles]}. "
                       f"Your role: {user.role.value}",
            )
        return user
    return checker