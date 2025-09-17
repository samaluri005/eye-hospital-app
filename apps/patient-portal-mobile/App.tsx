import React from 'react';
import { StyleSheet, Text, View, ScrollView } from 'react-native';

export default function App() {
  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Text style={styles.title}>Eye Hospital Patient Mobile App</Text>
        <Text style={styles.subtitle}>Mobile Patient Portal</Text>
        
        <View style={styles.grid}>
          <View style={[styles.card, styles.primaryCard]}>
            <Text style={styles.cardTitle}>Book Appointment</Text>
            <Text style={styles.cardText}>Schedule your next visit</Text>
          </View>
          
          <View style={[styles.card, styles.secondaryCard]}>
            <Text style={styles.cardTitle}>Medical Records</Text>
            <Text style={styles.cardText}>View your treatment history</Text>
          </View>
          
          <View style={[styles.card, styles.tertiaryCard]}>
            <Text style={styles.cardTitle}>Prescriptions</Text>
            <Text style={styles.cardText}>Manage your medications</Text>
          </View>
          
          <View style={[styles.card, styles.quaternaryCard]}>
            <Text style={styles.cardTitle}>Support</Text>
            <Text style={styles.cardText}>Get help and contact us</Text>
          </View>
        </View>
        
        <Text style={styles.version}>v1.0.0 - Mobile</Text>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    padding: 20,
    paddingTop: 60,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1e40af',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 40,
  },
  grid: {
    gap: 16,
  },
  card: {
    padding: 20,
    borderRadius: 12,
    marginBottom: 16,
  },
  primaryCard: {
    backgroundColor: '#dbeafe',
  },
  secondaryCard: {
    backgroundColor: '#dcfce7',
  },
  tertiaryCard: {
    backgroundColor: '#fdf4ff',
  },
  quaternaryCard: {
    backgroundColor: '#fff7ed',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
    color: '#1f2937',
  },
  cardText: {
    fontSize: 14,
    color: '#6b7280',
  },
  version: {
    textAlign: 'center',
    color: '#9ca3af',
    fontSize: 12,
    marginTop: 40,
  },
});