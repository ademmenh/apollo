import { describe, expect, it } from 'bun:test'
import { PhoneNumber } from '../domain/value-objects/phone-number.vo'
import { InvalidPhoneNumberError } from '../domain/user.errors'

describe('PhoneNumber', () => {
    describe('create', () => {
        it('valid phone number', () => {
            const validNumber = '0550123456'
            const phoneNumber = PhoneNumber.create(validNumber)
            expect(phoneNumber).toBeDefined()
            expect(phoneNumber.getValue()).toBe(validNumber)
        })

        it('invalid phone number', () => {
            const invalidNumber = '0450123456'
            expect(() => PhoneNumber.create(invalidNumber)).toThrow(InvalidPhoneNumberError)
        })
    })
})
