import Swal from "sweetalert2"
import { apiFetch } from "@/lib/apiClient"

export type VerifyActionResult = {
  ok: boolean
  reason?: "cancelled" | "invalid_password" | "unauthorized" | "error"
  message?: string
}

type DeleteSuccessOptions = {
  title?: string
  text?: string
  timer?: number
  showConfirmButton?: boolean
}

function normalizeErrorText(payload: unknown) {
  const data = payload as { error?: string; message?: string } | null
  const errorCode = String(data?.error ?? "").toLowerCase().trim()
  const errorMessage = String(data?.message ?? "").toLowerCase().trim()
  return `${errorCode} ${errorMessage}`.trim()
}

export async function promptPassword(): Promise<string | null> {
  const passwordPrompt = await Swal.fire({
    icon: "warning",
    title: "ยืนยันรหัสผ่าน",
    html: `
      <div style="position: relative;">
        <input
          id="verify-password"
          type="password"
          class="swal2-input"
          placeholder="รหัสผ่าน"
          autocomplete="current-password"
          style="margin: 0; padding-right: 2.75rem;"
        />
        <button
          type="button"
          id="toggle-password"
          aria-label="แสดงรหัสผ่าน"
          aria-pressed="false"
          style="
            position: absolute;
            right: 0.75rem;
            top: 50%;
            transform: translateY(-50%);
            background: transparent;
            border: none;
            padding: 0;
            color: #64748b;
            cursor: pointer;
          "
        >
          <svg
            id="eye-open"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
            <circle cx="12" cy="12" r="3" />
          </svg>
          <svg
            id="eye-closed"
            xmlns="http://www.w3.org/2000/svg"
            width="18"
            height="18"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
            style="display: none;"
          >
            <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-6.5 0-10-8-10-8a19.77 19.77 0 0 1 5.06-6.94" />
            <path d="M1 1l22 22" />
            <path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c6.5 0 10 8 10 8a19.86 19.86 0 0 1-3.05 4.88" />
            <path d="M14.12 14.12a3 3 0 0 1-4.24-4.24" />
          </svg>
        </button>
      </div>
    `,
    focusConfirm: false,
    showCancelButton: true,
    confirmButtonText: "ยืนยัน",
    cancelButtonText: "ยกเลิก",
    preConfirm: () => {
      const input = document.getElementById(
        "verify-password",
      ) as HTMLInputElement | null
      if (!input?.value) {
        Swal.showValidationMessage("กรุณากรอกรหัสผ่าน")
        return null
      }
      return input.value
    },
    didOpen: () => {
      const input = document.getElementById(
        "verify-password",
      ) as HTMLInputElement | null
      const toggle = document.getElementById(
        "toggle-password",
      ) as HTMLButtonElement | null
      const eyeOpen = document.getElementById("eye-open")
      const eyeClosed = document.getElementById("eye-closed")
      if (!input || !toggle) return
      input.focus()
      toggle.addEventListener("click", () => {
        const isHidden = input.type === "password"
        input.type = isHidden ? "text" : "password"
        toggle.setAttribute("aria-pressed", String(isHidden))
        toggle.setAttribute(
          "aria-label",
          isHidden ? "ซ่อนรหัสผ่าน" : "แสดงรหัสผ่าน",
        )
        if (eyeOpen && eyeClosed) {
          eyeOpen.style.display = isHidden ? "none" : "block"
          eyeClosed.style.display = isHidden ? "block" : "none"
        }
      })
    },
  })

  if (!passwordPrompt.isConfirmed || typeof passwordPrompt.value !== "string") {
    return null
  }

  return passwordPrompt.value
}

export async function verifyActionPassword(
  password: string,
): Promise<VerifyActionResult> {
  try {
    const refreshRes = await apiFetch("/api/auth/v2/refresh", {
      method: "POST",
      skipAuth: true,
      skipAuthRedirect: true,
    })

    if (!refreshRes.ok) {
      return {
        ok: false,
        reason: "unauthorized",
        message: "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่",
      }
    }

    const verifyRes = await apiFetch("/api/admin/v2/auth/verify-action", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        password,
      }),
      skipAuthRedirect: true,
    })

    const verifyData = await verifyRes.json().catch(() => null)
    if (!verifyRes.ok) {
      const errorText = normalizeErrorText(verifyData)
      const isInvalidPassword =
        errorText.includes("invalid_password") ||
        errorText.includes("wrong password") ||
        errorText.includes("password incorrect") ||
        (errorText.includes("password") && errorText.includes("invalid"))
      const isUnauthorized =
        verifyRes.status === 401 ||
        verifyRes.status === 403 ||
        errorText.includes("unauthorized") ||
        errorText.includes("token")
      const message = isInvalidPassword
        ? "ใส่รหัสผ่านผิด"
        : isUnauthorized
          ? "เซสชันหมดอายุ กรุณาเข้าสู่ระบบใหม่"
          : (verifyData && (verifyData.message as string | undefined)) ||
            (verifyData && (verifyData.error as string | undefined)) ||
            "ยืนยันรหัสผ่านไม่สำเร็จ"
      return {
        ok: false,
        reason: isInvalidPassword
          ? "invalid_password"
          : isUnauthorized
            ? "unauthorized"
            : "error",
        message,
      }
    }

    return { ok: true }
  } catch {
    return {
      ok: false,
      reason: "error",
      message: "ยืนยันรหัสผ่านไม่สำเร็จ",
    }
  }
}

export async function ensureVerifiedAction(): Promise<VerifyActionResult> {
  const password = await promptPassword()
  if (!password) {
    return { ok: false, reason: "cancelled" }
  }

  return verifyActionPassword(password)
}

export async function showDeleteSuccess(options: DeleteSuccessOptions = {}) {
  const {
    title = "ลบข้อมูลสำเร็จ",
    text,
    timer = 1600,
    showConfirmButton = false,
  } = options

  await Swal.fire({
    icon: "success",
    title,
    text,
    showConfirmButton,
    timer,
  })
}
