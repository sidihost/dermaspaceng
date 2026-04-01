import { NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import { deletePasskey } from '@/lib/passkey'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const success = await deletePasskey(user.id, id)
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Passkey deleted successfully' })
    } else {
      return NextResponse.json({ error: 'Passkey not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error deleting passkey:', error)
    return NextResponse.json({ error: 'Failed to delete passkey' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const body = await request.json()
    const { name } = body

    if (!name) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 })
    }

    const { updatePasskeyName } = await import('@/lib/passkey')
    const success = await updatePasskeyName(user.id, id, name)
    
    if (success) {
      return NextResponse.json({ success: true, message: 'Passkey updated successfully' })
    } else {
      return NextResponse.json({ error: 'Passkey not found' }, { status: 404 })
    }
  } catch (error) {
    console.error('Error updating passkey:', error)
    return NextResponse.json({ error: 'Failed to update passkey' }, { status: 500 })
  }
}
