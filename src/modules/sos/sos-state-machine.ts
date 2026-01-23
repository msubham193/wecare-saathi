import { CaseStatus } from '@prisma/client';
import { VALID_STATUS_TRANSITIONS, ERROR_MESSAGES } from '../../utils/constants';
import { logger } from '../../config/logger';

/**
 * SOS Case State Machine
 * Enforces strict status transition rules
 */
export class SOSStateMachine {
  /**
   * Validate if status transition is allowed
   * @param currentStatus Current status of the case
   * @param newStatus Desired new status
   * @returns true if transition is valid
   * @throws Error if transition is invalid
   */
  static validateTransition(currentStatus: CaseStatus, newStatus: CaseStatus): boolean {
    // Allow staying in the same status (for updates)
    if (currentStatus === newStatus) {
      return true;
    }
    
    // Check if transition is valid
    const allowedTransitions = VALID_STATUS_TRANSITIONS[currentStatus];
    
    if (!allowedTransitions || !allowedTransitions.includes(newStatus)) {
      logger.warn(`Invalid status transition attempted: ${currentStatus} -> ${newStatus}`);
      throw new Error(
        `${ERROR_MESSAGES.INVALID_STATUS_TRANSITION}: Cannot move from ${currentStatus} to ${newStatus}`
      );
    }
    
    return true;
  }
  
  /**
   * Get next allowed statuses for current status
   * @param currentStatus Current status
   * @returns Array of allowed next statuses
   */
  static getAllowedNextStatuses(currentStatus: CaseStatus): CaseStatus[] {
    const transitions = VALID_STATUS_TRANSITIONS[currentStatus];
    return transitions ? (transitions as CaseStatus[]) : [];
  }
  
  /**
   * Check if a status is terminal (no further transitions)
   * @param status Status to check
   * @returns true if status is terminal
   */
  static isTerminalStatus(status: CaseStatus): boolean {
    const transitions = VALID_STATUS_TRANSITIONS[status];
    return !transitions || transitions.length === 0;
  }
  
  /**
   * Get the initial status for new cases
   */
  static getInitialStatus(): CaseStatus {
    return CaseStatus.CREATED;
  }
  
  /**
   * Validate state transition with business rules
   * @param currentStatus Current status
   * @param newStatus New status
   * @param context Additional context for validation
   */
  static validateTransitionWithContext(
    currentStatus: CaseStatus,
    newStatus: CaseStatus,
    context: {
      hasOfficer: boolean;
      isOfficer: boolean;
      isAdmin: boolean;
    }
  ): boolean {
    // First validate the status transition itself
    this.validateTransition(currentStatus, newStatus);
    
    // Additional business rules
    
    // Only officers can acknowledge, en route, on scene, action taken
    if (
      [
        CaseStatus.ACKNOWLEDGED,
        CaseStatus.EN_ROUTE,
        CaseStatus.ON_SCENE,
        CaseStatus.ACTION_TAKEN,
      ].includes(newStatus) &&
      !context.isOfficer &&
      !context.isAdmin
    ) {
      throw new Error('Only assigned officer can update these statuses');
    }
    
    // Case must be assigned before officer can acknowledge
    if (newStatus === CaseStatus.ACKNOWLEDGED && !context.hasOfficer) {
      throw new Error('Case must be assigned to an officer first');
    }
    
    // Only admin can force close (or officer after ACTION_TAKEN)
    if (newStatus === CaseStatus.CLOSED) {
      if (currentStatus !== CaseStatus.ACTION_TAKEN && !context.isAdmin) {
        throw new Error('Only admin can force close a case');
      }
    }
    
    return true;
  }
}
