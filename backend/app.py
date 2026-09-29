from datetime import datetime, timedelta
from typing import Optional

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel
from sqlalchemy import (
    create_engine,
    Column,
    Integer,
    String,
    Text,
    DateTime,
    ForeignKey,
)
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from jose import jwt
import hashlib


# ============================================================
# CONFIGURATION
# ============================================================

DATABASE_URL = "sqlite:///./hobby_tracker.db"

SECRET_KEY = "cloud-hobby-skills-tracker-demo-secret"
ALGORITHM = "HS256"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()

app = FastAPI(
    title="Online Hobby & Skills Tracker API",
    description="Cloud-oriented Hobby and Skills Tracker MVP",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://localhost:5174",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

security = HTTPBearer()


# ============================================================
# DATABASE MODELS
# ============================================================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, nullable=False, index=True)
    password = Column(String(255), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    hobbies = relationship(
        "Hobby",
        back_populates="user",
        cascade="all, delete-orphan"
    )

    posts = relationship(
        "Post",
        back_populates="user",
        cascade="all, delete-orphan"
    )


class Hobby(Base):
    __tablename__ = "hobbies"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    name = Column(String(100), nullable=False)
    category = Column(String(100), nullable=False)
    goal = Column(String(255), default="")
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="hobbies")
    practices = relationship(
        "Practice",
        back_populates="hobby",
        cascade="all, delete-orphan"
    )


class Practice(Base):
    __tablename__ = "practices"

    id = Column(Integer, primary_key=True, index=True)
    hobby_id = Column(Integer, ForeignKey("hobbies.id"))
    duration = Column(Integer, default=30)
    notes = Column(Text, default="")
    practiced_at = Column(DateTime, default=datetime.utcnow)

    hobby = relationship("Hobby", back_populates="practices")


class Post(Base):
    __tablename__ = "posts"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    likes = Column(Integer, default=0)
    created_at = Column(DateTime, default=datetime.utcnow)

    user = relationship("User", back_populates="posts")
    comments = relationship(
        "Comment",
        back_populates="post",
        cascade="all, delete-orphan"
    )


class Comment(Base):
    __tablename__ = "comments"

    id = Column(Integer, primary_key=True, index=True)
    post_id = Column(Integer, ForeignKey("posts.id"))
    user_id = Column(Integer, ForeignKey("users.id"))
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)

    post = relationship("Post", back_populates="comments")


Base.metadata.create_all(bind=engine)


# ============================================================
# DATABASE DEPENDENCY
# ============================================================

def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# ============================================================
# PASSWORD HELPERS
# ============================================================

def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()


def verify_password(password: str, hashed_password: str) -> bool:
    return hash_password(password) == hashed_password


# ============================================================
# AUTH HELPERS
# ============================================================

def create_token(user_id: int):
    payload = {
        "user_id": user_id,
        "exp": datetime.utcnow() + timedelta(hours=24)
    }

    return jwt.encode(
        payload,
        SECRET_KEY,
        algorithm=ALGORITHM
    )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        payload = jwt.decode(
            credentials.credentials,
            SECRET_KEY,
            algorithms=[ALGORITHM]
        )

        user_id = payload.get("user_id")

        if not user_id:
            raise HTTPException(
                status_code=401,
                detail="Invalid authentication token"
            )

    except Exception:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


# ============================================================
# REQUEST SCHEMAS
# ============================================================

class RegisterRequest(BaseModel):
    name: str
    email: str
    password: str


class LoginRequest(BaseModel):
    email: str
    password: str


class HobbyRequest(BaseModel):
    name: str
    category: str
    goal: str = ""


class PracticeRequest(BaseModel):
    hobby_id: int
    duration: int = 30
    notes: str = ""


class PostRequest(BaseModel):
    content: str


class CommentRequest(BaseModel):
    content: str


# ============================================================
# BASIC ROUTES
# ============================================================

@app.get("/")
def root():
    return {
        "message": "Online Hobby & Skills Tracker API",
        "status": "running",
        "version": "1.0.0"
    }


@app.get("/health")
def health():
    return {
        "status": "ok",
        "service": "hobby-skills-tracker"
    }


# ============================================================
# AUTHENTICATION
# ============================================================

@app.post("/register")
def register(
    request: RegisterRequest,
    db: Session = Depends(get_db)
):
    existing_user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    user = User(
        name=request.name,
        email=request.email,
        password=hash_password(request.password)
    )

    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id)

    return {
        "message": "Registration successful",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


@app.post("/login")
def login(
    request: LoginRequest,
    db: Session = Depends(get_db)
):
    user = (
        db.query(User)
        .filter(User.email == request.email)
        .first()
    )

    if not user or not verify_password(
        request.password,
        user.password
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    token = create_token(user.id)

    return {
        "message": "Login successful",
        "token": token,
        "user": {
            "id": user.id,
            "name": user.name,
            "email": user.email
        }
    }


@app.get("/me")
def get_me(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    }


# ============================================================
# HOBBIES / SKILLS
# ============================================================

@app.post("/hobbies")
def create_hobby(
    request: HobbyRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hobby = Hobby(
        user_id=current_user.id,
        name=request.name,
        category=request.category,
        goal=request.goal
    )

    db.add(hobby)
    db.commit()
    db.refresh(hobby)

    return {
        "message": "Hobby created successfully",
        "hobby": {
            "id": hobby.id,
            "name": hobby.name,
            "category": hobby.category,
            "goal": hobby.goal
        }
    }


@app.get("/hobbies")
def get_hobbies(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hobbies = (
        db.query(Hobby)
        .filter(Hobby.user_id == current_user.id)
        .all()
    )

    return [
        {
            "id": hobby.id,
            "name": hobby.name,
            "category": hobby.category,
            "goal": hobby.goal
        }
        for hobby in hobbies
    ]


# ============================================================
# PRACTICE SESSIONS
# ============================================================

@app.post("/practice")
def log_practice(
    request: PracticeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hobby = (
        db.query(Hobby)
        .filter(
            Hobby.id == request.hobby_id,
            Hobby.user_id == current_user.id
        )
        .first()
    )

    if not hobby:
        raise HTTPException(
            status_code=404,
            detail="Hobby not found"
        )

    practice = Practice(
        hobby_id=hobby.id,
        duration=request.duration,
        notes=request.notes
    )

    db.add(practice)
    db.commit()
    db.refresh(practice)

    return {
        "message": "Practice session logged",
        "practice": {
            "id": practice.id,
            "hobby": hobby.name,
            "duration": practice.duration,
            "notes": practice.notes,
            "date": practice.practiced_at.strftime("%Y-%m-%d")
        }
    }


@app.get("/practice")
def get_practice(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    practices = (
        db.query(Practice)
        .join(Hobby)
        .filter(Hobby.user_id == current_user.id)
        .order_by(Practice.practiced_at.desc())
        .all()
    )

    return [
        {
            "id": practice.id,
            "hobby": practice.hobby.name,
            "duration": practice.duration,
            "notes": practice.notes,
            "date": practice.practiced_at.strftime("%Y-%m-%d")
        }
        for practice in practices
    ]


# ============================================================
# DASHBOARD / STREAKS / BADGES
# ============================================================

@app.get("/dashboard")
def dashboard(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hobbies = (
        db.query(Hobby)
        .filter(Hobby.user_id == current_user.id)
        .all()
    )

    practices = (
        db.query(Practice)
        .join(Hobby)
        .filter(Hobby.user_id == current_user.id)
        .all()
    )

    total_minutes = sum(
        practice.duration for practice in practices
    )

    total_sessions = len(practices)

    # Simple streak calculation based on unique practice dates
    practice_dates = sorted(
        {
            practice.practiced_at.date()
            for practice in practices
        },
        reverse=True
    )

    streak = 0

    if practice_dates:
        streak = 1

        for i in range(1, len(practice_dates)):
            difference = (
                practice_dates[i - 1] - practice_dates[i]
            ).days

            if difference == 1:
                streak += 1
            else:
                break

    badges = []

    if total_sessions >= 1:
        badges.append("First Practice")

    if total_sessions >= 5:
        badges.append("5 Sessions")

    if total_sessions >= 10:
        badges.append("10 Sessions")

    if total_minutes >= 300:
        badges.append("5 Hour Champion")

    if streak >= 3:
        badges.append("3 Day Streak")

    return {
        "user": current_user.name,
        "total_hobbies": len(hobbies),
        "total_sessions": total_sessions,
        "total_minutes": total_minutes,
        "current_streak": streak,
        "badges": badges
    }


# ============================================================
# COMMUNITY POSTS
# ============================================================

@app.post("/posts")
def create_post(
    request: PostRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    if not request.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Post content cannot be empty"
        )

    post = Post(
        user_id=current_user.id,
        content=request.content.strip()
    )

    db.add(post)
    db.commit()
    db.refresh(post)

    return {
        "message": "Post shared successfully",
        "post": {
            "id": post.id,
            "author": current_user.name,
            "content": post.content,
            "likes": post.likes,
            "created_at": post.created_at.isoformat()
        }
    }


@app.get("/posts")
def get_posts(
    db: Session = Depends(get_db)
):
    posts = (
        db.query(Post)
        .order_by(Post.created_at.desc())
        .all()
    )

    result = []

    for post in posts:
        comments = (
            db.query(Comment)
            .filter(Comment.post_id == post.id)
            .order_by(Comment.created_at.asc())
            .all()
        )

        result.append({
            "id": post.id,
            "author": post.user.name,
            "content": post.content,
            "likes": post.likes,
            "created_at": post.created_at.isoformat(),
            "comments": [
                {
                    "id": comment.id,
                    "author": db.query(User)
                    .filter(User.id == comment.user_id)
                    .first().name,
                    "content": comment.content
                }
                for comment in comments
            ]
        })

    return result


@app.post("/posts/{post_id}/like")
def like_post(
    post_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = (
        db.query(Post)
        .filter(Post.id == post_id)
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    post.likes += 1

    db.commit()

    return {
        "message": "Post liked",
        "likes": post.likes
    }


# ============================================================
# COMMENTS
# ============================================================

@app.post("/posts/{post_id}/comments")
def add_comment(
    post_id: int,
    request: CommentRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    post = (
        db.query(Post)
        .filter(Post.id == post_id)
        .first()
    )

    if not post:
        raise HTTPException(
            status_code=404,
            detail="Post not found"
        )

    if not request.content.strip():
        raise HTTPException(
            status_code=400,
            detail="Comment cannot be empty"
        )

    comment = Comment(
        post_id=post_id,
        user_id=current_user.id,
        content=request.content.strip()
    )

    db.add(comment)
    db.commit()
    db.refresh(comment)

    return {
        "message": "Comment added",
        "comment": {
            "id": comment.id,
            "author": current_user.name,
            "content": comment.content
        }
    }


# ============================================================
# ANALYTICS
# ============================================================

@app.get("/analytics")
def analytics(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    hobbies = (
        db.query(Hobby)
        .filter(Hobby.user_id == current_user.id)
        .all()
    )

    analytics_data = []

    for hobby in hobbies:
        practices = (
            db.query(Practice)
            .filter(Practice.hobby_id == hobby.id)
            .all()
        )

        analytics_data.append({
            "hobby": hobby.name,
            "sessions": len(practices),
            "minutes": sum(
                practice.duration
                for practice in practices
            )
        })

    return analytics_data