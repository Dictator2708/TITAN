from datetime import date, datetime, timezone
from typing import List, Optional
from sqlalchemy import desc, or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import NotFoundException
from app.models.task import Task
from app.schemas.task import TaskCreate, TaskUpdate
from app.services.activity_service import log_activity


async def create_task(db: AsyncSession, user_id: int, task_in: TaskCreate) -> Task:
    task = Task(
        user_id=user_id,
        title=task_in.title,
        description=task_in.description,
        status=task_in.status or "pending",
        priority=task_in.priority or "medium",
        due_date=task_in.due_date,
        due_time=task_in.due_time,
        completed_at=datetime.now(timezone.utc) if task_in.status == "completed" else None,
    )
    db.add(task)
    await db.flush()

    await log_activity(
        db,
        user_id=user_id,
        action_type="task_created",
        entity_type="task",
        entity_id=str(task.id),
        details={"title": task.title, "priority": task.priority, "status": task.status},
    )
    await db.commit()
    await db.refresh(task)
    return task


async def get_tasks(
    db: AsyncSession,
    user_id: int,
    status: Optional[str] = None,
    priority: Optional[str] = None,
    search: Optional[str] = None,
    due_date: Optional[date] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Task]:
    query = select(Task).where(Task.user_id == user_id)

    if status and status != "all":
        query = query.where(Task.status == status)
    if priority and priority != "all":
        query = query.where(Task.priority == priority)
    if due_date:
        query = query.where(Task.due_date == due_date)
    if search and search.strip():
        term = f"%{search.strip()}%"
        query = query.where(or_(Task.title.ilike(term), Task.description.ilike(term)))

    query = query.order_by(
        desc(Task.created_at)
    ).offset(offset).limit(limit)

    result = await db.execute(query)
    return list(result.scalars().all())


async def get_task_by_id(db: AsyncSession, user_id: int, task_id: int) -> Task:
    result = await db.execute(
        select(Task).where(Task.id == task_id, Task.user_id == user_id)
    )
    task = result.scalar_one_or_none()
    if not task:
        raise NotFoundException("Task", task_id)
    return task


async def update_task(
    db: AsyncSession, user_id: int, task_id: int, task_in: TaskUpdate
) -> Task:
    task = await get_task_by_id(db, user_id, task_id)
    
    update_data = task_in.model_dump(exclude_unset=True)
    
    if "status" in update_data:
        new_status = update_data["status"]
        if new_status == "completed" and task.status != "completed":
            task.completed_at = datetime.now(timezone.utc)
            await log_activity(
                db,
                user_id=user_id,
                action_type="task_completed",
                entity_type="task",
                entity_id=str(task.id),
                details={"title": task.title},
            )
        elif new_status != "completed":
            task.completed_at = None

    for field, value in update_data.items():
        setattr(task, field, value)

    await log_activity(
        db,
        user_id=user_id,
        action_type="task_updated",
        entity_type="task",
        entity_id=str(task.id),
        details={"title": task.title, "status": task.status, "priority": task.priority},
    )
    await db.commit()
    await db.refresh(task)
    return task


async def complete_task(db: AsyncSession, user_id: int, task_id: int) -> Task:
    task = await get_task_by_id(db, user_id, task_id)
    task.status = "completed"
    task.completed_at = datetime.now(timezone.utc)
    
    await log_activity(
        db,
        user_id=user_id,
        action_type="task_completed",
        entity_type="task",
        entity_id=str(task.id),
        details={"title": task.title},
    )
    await db.commit()
    await db.refresh(task)
    return task


async def delete_task(db: AsyncSession, user_id: int, task_id: int) -> bool:
    task = await get_task_by_id(db, user_id, task_id)
    title = task.title
    await db.delete(task)
    
    await log_activity(
        db,
        user_id=user_id,
        action_type="task_deleted",
        entity_type="task",
        entity_id=str(task_id),
        details={"title": title},
    )
    await db.commit()
    return True
