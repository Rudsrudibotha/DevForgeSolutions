import 'package:flutter_bloc/flutter_bloc.dart';
import '../../services/google_auth_service.dart';

abstract class AuthEvent {}
class LoginRequested extends AuthEvent {
  final String email;
  final String password;
  LoginRequested(this.email, this.password);
}
class GoogleSignInRequested extends AuthEvent {}
class LogoutRequested extends AuthEvent {}

abstract class AuthState {}
class AuthInitial extends AuthState {}
class AuthLoading extends AuthState {}
class AuthAuthenticated extends AuthState {
  final String schoolId;
  final String userRole;
  AuthAuthenticated(this.schoolId, this.userRole);
}
class AuthError extends AuthState {
  final String message;
  AuthError(this.message);
}

class AuthBloc extends Bloc<AuthEvent, AuthState> {
  AuthBloc() : super(AuthInitial()) {
    on<LoginRequested>(_onLoginRequested);
    on<GoogleSignInRequested>(_onGoogleSignInRequested);
    on<LogoutRequested>(_onLogoutRequested);
  }

  void _onLoginRequested(LoginRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      // TODO: Implement actual authentication with PostgreSQL
      await Future.delayed(const Duration(seconds: 1));
      emit(AuthAuthenticated('school-uuid', 'school_admin'));
    } catch (e) {
      emit(AuthError('Login failed'));
    }
  }

  void _onGoogleSignInRequested(GoogleSignInRequested event, Emitter<AuthState> emit) async {
    emit(AuthLoading());
    try {
      final account = await GoogleAuthService.signInWithGoogle();
      if (account != null) {
        // TODO: Send Google account info to backend for verification
        emit(AuthAuthenticated('school-uuid', 'school_admin'));
      } else {
        emit(AuthError('Google Sign-In cancelled'));
      }
    } catch (e) {
      emit(AuthError('Google Sign-In failed'));
    }
  }

  void _onLogoutRequested(LogoutRequested event, Emitter<AuthState> emit) async {
    await GoogleAuthService.signOut();
    emit(AuthInitial());
  }
}