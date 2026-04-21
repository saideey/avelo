from fastapi import HTTPException, status


class AppException(HTTPException):
    def __init__(self, status_code: int, detail: str, code: str = "error"):
        super().__init__(status_code=status_code, detail={"message": detail, "code": code})


class NotFoundError(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(status.HTTP_404_NOT_FOUND, f"{resource} topilmadi", "not_found")


class UnauthorizedError(AppException):
    def __init__(self, detail: str = "Avtorizatsiya talab qilinadi"):
        super().__init__(status.HTTP_401_UNAUTHORIZED, detail, "unauthorized")


class ForbiddenError(AppException):
    def __init__(self, detail: str = "Ruxsat yo'q"):
        super().__init__(status.HTTP_403_FORBIDDEN, detail, "forbidden")


class BadRequestError(AppException):
    def __init__(self, detail: str = "Noto'g'ri so'rov"):
        super().__init__(status.HTTP_400_BAD_REQUEST, detail, "bad_request")


class ConflictError(AppException):
    def __init__(self, detail: str = "Conflict"):
        super().__init__(status.HTTP_409_CONFLICT, detail, "conflict")
