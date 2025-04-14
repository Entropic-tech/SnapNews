import { Stack, StackProps } from "aws-cdk-lib";
import {
    aws_lambda as lambda,
    aws_s3 as s3,
    aws_events as events,
    aws_logs as logs,
    aws_events_targets as targets,
    aws_ssm as ssm,
    Duration,
    RemovalPolicy,
} from "aws-cdk-lib";
import { Construct } from "constructs";
import { readFileSync } from "fs";
import { join } from "path";

export interface ReaderStackProps extends StackProps {
    appName: string;
    bucketName: string;
    layers: {
        COMMON_SSM_PARAMETER_NAME: string;
        POWERTOOLS_ARN: string;
    };
    readSchedule: number;
}

export class ReaderStack extends Stack {
    constructor(scope: Construct, id: string, props: ReaderStackProps) {
        super(scope, id, props);

        // Configure the Layer
        const commonLayerArn = ssm.StringParameter.fromStringParameterAttributes(this, `${props.appName}-CommonLayerArn`, {
            parameterName: props.layers.COMMON_SSM_PARAMETER_NAME,
        });
        const commonLayer = lambda.LayerVersion.fromLayerVersionArn(this, `${props.appName}-CommonLayer`, commonLayerArn.stringValue);
        const powertoolsLayer = lambda.LayerVersion.fromLayerVersionArn(
            this,
            `${props.appName}-PowertoolsLayer`,
            props.layers.POWERTOOLS_ARN
        );

        // Configure the Reader Lambda
        const readerFn = new lambda.Function(this, `${props.appName}-Reader`, {
            functionName: `${props.appName}-Reader`,
            runtime: lambda.Runtime.PYTHON_3_12,
            handler: "app.main",
            code: lambda.Code.fromAsset(join(__dirname, "fn/reader")),
            layers: [commonLayer, powertoolsLayer],
            timeout: Duration.seconds(120),
            environment: {
                NEWS_FEED_BUCKET: props.bucketName,
            },
        });

        const bucket = s3.Bucket.fromBucketName(this, `${props.appName}-NewsFeedBucket`, props.bucketName);
        bucket.grantReadWrite(readerFn);

        const rule = new events.Rule(this, `${props.appName}-ReaderSchedulerRule`, {
            ruleName: `${props.appName}-ReaderSchedulerRule`,
            schedule: events.Schedule.rate(Duration.hours(props.readSchedule)),
        });

        const newsSources = JSON.parse(readFileSync(join(__dirname, "../../NewsSources.json"), "utf8"));

        for (const source of newsSources.Sources) {
            rule.addTarget(
                new targets.LambdaFunction(readerFn, {
                    event: events.RuleTargetInput.fromObject({
                        NewsSource: source.Name,
                        NewsUrl: source.Url,
                    }),
                })
            );
        }

        new logs.LogGroup(this, `${props.appName}-ReaderLogGroup`, {
            logGroupName: `/aws/lambda/${props.appName}-Reader`,
            removalPolicy: RemovalPolicy.DESTROY,
            retention: logs.RetentionDays.TWO_WEEKS,
        });
    }
}
