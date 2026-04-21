from math import ceil


def paginate(total: int, page: int, size: int) -> dict:
    return {
        "total": total,
        "page": page,
        "size": size,
        "pages": ceil(total / size) if size > 0 else 0,
    }
