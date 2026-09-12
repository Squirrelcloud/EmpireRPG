#pragma once

#include "CoreMinimal.h"
#include "Engine/DataTable.h"
#include "EmpireTypes.generated.h"

USTRUCT(BlueprintType)
struct FCrewRow : public FTableRowBase
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FText DisplayName;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName Role;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 Combat = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 Influence = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 StreetSense = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 Loyalty = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 HeatTolerance = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName StartingTerritory;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FSoftObjectPath Portrait;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FString Notes;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	bool bDeployable = true;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	bool bDebriefSpeaker = false;
};

USTRUCT(BlueprintType)
struct FTerritoryRow : public FTableRowBase
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FText DisplayName;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName DistrictType;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FString Adjacent;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 StartingControl = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 StartingHeat = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 Income = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 DefenseDifficulty = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 UnlockWave = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	bool bV0Active = false;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 MapX = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 MapY = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FSoftObjectPath Art;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FString Blurb;
};

USTRUCT(BlueprintType)
struct FQuestRow : public FTableRowBase
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FText Title;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName Type;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName TerritoryId;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 RequiredCrewMin = 1;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 HeatDeltaOnWin = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ControlDeltaOnWin = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ControlDeltaOnLoss = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 LoyaltyDeltaOnWin = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 LoyaltyDeltaOnLoss = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName DialogueStartId;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName UnlockAfter;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	bool bV0Active = false;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FString Summary;
};

USTRUCT(BlueprintType)
struct FDialogueChoice
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FText Text;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName Next;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName LoyaltyId;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 LoyaltyDelta = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 HeatDelta = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ControlId;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ControlDelta = 0;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName Flag;
};

USTRUCT(BlueprintType)
struct FDialogueRow : public FTableRowBase
{
	GENERATED_BODY()

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName Speaker;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FText Text;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FText ChoiceA_Text;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceA_Next;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceA_LoyaltyId;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ChoiceA_LoyaltyDelta = 0;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ChoiceA_HeatDelta = 0;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceA_ControlId;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ChoiceA_ControlDelta = 0;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceA_Flag;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FText ChoiceB_Text;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceB_Next;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceB_LoyaltyId;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ChoiceB_LoyaltyDelta = 0;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ChoiceB_HeatDelta = 0;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceB_ControlId;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ChoiceB_ControlDelta = 0;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceB_Flag;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FText ChoiceC_Text;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceC_Next;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceC_LoyaltyId;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ChoiceC_LoyaltyDelta = 0;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ChoiceC_HeatDelta = 0;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceC_ControlId;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	int32 ChoiceC_ControlDelta = 0;
	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	FName ChoiceC_Flag;

	UPROPERTY(EditAnywhere, BlueprintReadOnly)
	bool bEndsScene = false;
};
